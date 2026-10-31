#!/usr/bin/env bash
# Répétition complète de la production sur Docker Desktop, avant toute livraison sensible
# (nouvelle version de Supabase, changement de compose.prod.yaml, de Nginx ou des scripts).
#
#   bash deploy/rehearsal.sh          base neuve, image construite, déploiement, données de démo
#   bash deploy/rehearsal.sh deploy   redéploie une nouvelle image (test de la bascule)
#   bash deploy/rehearsal.sh down     arrête tout et efface la base de répétition
#
# Puis : BASE_URL=http://saasclair.localhost:3150 npm run test:e2e
set -euo pipefail
cd "$(dirname "$0")/.."
export ROOT=$PWD ENV_FILE=$PWD/.rehearsal/.env
export COMPOSE_PROJECT_NAME=saasclair-rehearsal COMPOSE_OVERRIDE=$PWD/deploy/compose.rehearsal.yaml
export UPSTREAM_FILE=$PWD/.rehearsal/nginx/upstream.conf NGINX_SERVICE=proxy
# Adresse IPv4 de la machine vue des conteneurs (host.docker.internal y a aussi une IPv6 injoignable).
UPSTREAM_HOST=$(docker run --rm --add-host=hote:host-gateway nginx:1.29-alpine getent ahostsv4 hote | awk 'NR==1{print $1}')
export UPSTREAM_HOST
source deploy/scripts/lib.sh
site=http://saasclair.localhost:3150

build_and_deploy() {
  local tag
  tag=saasclair-rehearsal:$(date +%H%M%S)
  log "Image de production ($tag)"
  docker build -q --target runner \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$(env_value API_EXTERNAL_URL)" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$(env_value ANON_KEY)" \
    --build-arg NEXT_PUBLIC_SITE_URL="$(env_value SITE_URL)" \
    --build-arg REVISION="$tag" -t "$tag" . >/dev/null
  bash deploy/scripts/deploy.sh "$tag"
}

case "${1:-}" in
  down)
    dc --profile web down -v --remove-orphans
    rm -rf .rehearsal
    exit 0
    ;;
  deploy)
    build_and_deploy
    exit 0
    ;;
esac

mkdir -p .rehearsal
DOMAIN=saasclair.localhost SCHEME=http PUBLIC_PORT=3150 bash deploy/scripts/gen-env.sh >/dev/null
TEMPLATES_ROOT=/srv/saasclair bash deploy/scripts/render-nginx.sh >.rehearsal/nginx.conf
mkdir -p .rehearsal/nginx
[ -f "$UPSTREAM_FILE" ] || printf 'server %s:%s max_fails=0;\n' "$UPSTREAM_HOST" "$(env_value WEB_PORT_BLUE)" >"$UPSTREAM_FILE"

log "Supabase (base, Auth, API) et Nginx"
dc up -d --wait --wait-timeout 300 db auth rest proxy
bash deploy/scripts/migrate.sh
build_and_deploy

log "Données de démonstration (répétition uniquement, jamais en production)"
cat supabase/seed.sql supabase/seed-admin.sql | db_psql >/dev/null
log "Prêt : $site"
