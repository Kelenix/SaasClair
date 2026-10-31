#!/usr/bin/env bash
# Met en service une version de l'application sans coupure (lancé par la CD, ou à la main).
#
#   deploy.sh <image>     nouvelle version (tirée de GHCR si GHCR_TOKEN et GHCR_USER sont fournis)
#   deploy.sh --rollback  remet en service la version précédente, toujours gardée sur le serveur
#   deploy.sh --restart   relit le .env (après une modification) sans changer de version
#
# Principe : la version en service (couleur blue ou green) continue de répondre pendant que la
# nouvelle démarre sur l'autre couleur. Nginx ne bascule qu'une fois sa santé vérifiée, puis
# l'ancienne s'arrête quelques secondes plus tard. Sinon la nouvelle est arrêtée : rien ne change.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
cd "$ROOT"

# Santé complète : l'application répond ET joint Auth et l'API de données par l'URL publique.
smoke() {
  local port url
  port=$(env_value "WEB_PORT_${1^^}")
  url="http://127.0.0.1:$port/api/health${SMOKE_QUERY-?complet=1}"
  for _ in 1 2 3 4 5 6; do
    curl -fsS --max-time 5 "$url" >/dev/null 2>&1 && return 0
    sleep 5
  done
  curl -sS --max-time 5 "$url" >&2 || true
  return 1
}

# Démarre la couleur $1, vérifie sa santé, puis arrête la couleur $2.
switch_to() {
  local next=$1 current=$2
  if ! dc up -d --no-deps --force-recreate --wait --wait-timeout 120 "web-$next"; then
    dc logs --tail 40 "web-$next" >&2 || true
    dc stop "web-$next" >/dev/null 2>&1 || true
    fail "La nouvelle version ne démarre pas : la version actuelle reste en service."
  fi
  if ! smoke "$next"; then
    dc logs --tail 40 "web-$next" >&2 || true
    dc stop "web-$next" >/dev/null 2>&1 || true
    fail "Contrôle de santé refusé : la version actuelle reste en service."
  fi
  local previous
  previous=$(cat "$UPSTREAM_FILE" 2>/dev/null || true)
  if ! nginx_point_to "$next"; then
    [ -z "$previous" ] || printf '%s\n' "$previous" >"$UPSTREAM_FILE"
    dc stop "web-$next" >/dev/null 2>&1 || true
    fail "Nginx a refusé la bascule (nginx -t) : la version actuelle reste en service."
  fi
  if [ "$current" != none ] && [ "$current" != "$next" ]; then
    sleep "${DRAIN_SECONDS:-5}" # les requêtes en cours se terminent sur l'ancienne version
    dc stop "web-$current" >/dev/null
  fi
  echo "$next" >"$ROOT/.active-color"
  log "En service : $next ($(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "saasclair-web:$next" 2>/dev/null || echo ?))"
}

# Supabase (base, Auth, API) : démarré, et recréé seulement si sa configuration a changé.
supabase_up() { dc up -d --wait --wait-timeout 180 db auth rest; }

current=$(active_color)
case "${1:-}" in
  --rollback)
    [ "$current" != none ] || fail "Aucune version en service."
    previous=$(other_color "$current")
    docker image inspect "saasclair-web:$previous" >/dev/null 2>&1 || fail "Aucune version précédente sur ce serveur."
    log "Retour à la version précédente ($current → $previous)"
    switch_to "$previous" "$current"
    ;;
  --restart)
    supabase_up
    if [ "$current" = none ]; then
      # Rien en service (après une restauration, par exemple) : on relance la dernière version.
      last=$(cat "$ROOT/.active-color" 2>/dev/null || true)
      [ -n "$last" ] || { log "Supabase relancé (aucune version de l'application déployée)."; exit 0; }
      switch_to "$last" none
    else
      next=$(other_color "$current")
      docker tag "saasclair-web:$current" "saasclair-web:$next"
      switch_to "$next" "$current"
    fi
    ;;
  "" | -*)
    sed -n '2,10p' "$0"
    exit 1
    ;;
  *)
    image=$1
    if [ -n "${GHCR_TOKEN:-}" ]; then
      echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:?GHCR_USER manquant}" --password-stdin >/dev/null
      docker pull -q "$image"
      docker logout ghcr.io >/dev/null
    fi
    next=$(other_color "$current")
    log "Nouvelle version sur $next (en service : $current)"
    supabase_up
    bash "$(dirname "$0")/migrate.sh"
    docker tag "$image" "saasclair-web:$next"
    switch_to "$next" "$current"
    # Ménage : seulement les images de SaasClair (jamais celles des autres sites du serveur),
    # en gardant les 3 plus récentes en plus des deux couleurs.
    repo=${image%:*}
    docker images "$repo" --format '{{.Repository}}:{{.Tag}}' | tail -n +4 | xargs -r docker rmi >/dev/null 2>&1 || true
    ;;
esac
