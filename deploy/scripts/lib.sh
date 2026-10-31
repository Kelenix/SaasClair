# Fonctions communes aux scripts du serveur (source "$(dirname "$0")/lib.sh").
# ROOT : dossier de l'application sur le serveur (/srv/saasclair) ; surchargé pour la répétition
# locale (deploy/rehearsal.sh).
ROOT=${ROOT:-/srv/saasclair}
ENV_FILE=${ENV_FILE:-$ROOT/.env}
COMPOSE_FILE=${COMPOSE_FILE:-$ROOT/deploy/compose.prod.yaml}
UPSTREAM_FILE=${UPSTREAM_FILE:-$ROOT/nginx/upstream.conf}
# Toujours depuis le dossier de l’application : lancé en « deploy » depuis le dossier de root,
# docker compose échoue (« stat .: permission denied »).
cd "$ROOT"

# COMPOSE_OVERRIDE (facultatif) : second fichier compose, pour la répétition locale.
dc() { docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ${COMPOSE_OVERRIDE:+-f "$COMPOSE_OVERRIDE"} "$@"; }

# Lit une variable du .env sans l'exécuter.
env_value() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2-; }

# psql dans le conteneur de la base, en tant que « postgres » (comme `supabase db push`).
db_psql() { dc exec -T -e PGOPTIONS=-cclient_min_messages=warning db psql -v ON_ERROR_STOP=1 -h localhost -U postgres -d postgres -qAt "$@"; }

# Couleur de l'application en service : blue, green ou none.
active_color() {
  local color
  for color in blue green; do
    if [ -n "$(dc ps -q --status running "web-$color" 2>/dev/null)" ]; then
      echo "$color"
      return
    fi
  done
  echo none
}

# Fait pointer Nginx vers la couleur $1, puis le recharge en douceur. Sur le VPS, « deploy » n'a
# droit qu'à ces deux commandes (/etc/sudoers.d/saasclair) ; en répétition, Nginx est un conteneur.
nginx_point_to() {
  local port
  port=$(env_value "WEB_PORT_${1^^}")
  mkdir -p "$(dirname "$UPSTREAM_FILE")"
  printf '# Écrit par deploy.sh : version en service (%s)\nserver %s:%s max_fails=0;\n' \
    "$1" "${UPSTREAM_HOST:-127.0.0.1}" "$port" >"$UPSTREAM_FILE.tmp"
  mv "$UPSTREAM_FILE.tmp" "$UPSTREAM_FILE"
  if [ -n "${NGINX_SERVICE:-}" ]; then
    dc exec -T "$NGINX_SERVICE" nginx -t -q && dc exec -T "$NGINX_SERVICE" nginx -s reload
  else
    sudo -n /usr/sbin/nginx -t -q && sudo -n /usr/sbin/nginx -s reload
  fi
}

other_color() { [ "$1" = blue ] && echo green || echo blue; }

log() { printf '\033[1;32m▸\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }
