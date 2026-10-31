#!/usr/bin/env bash
# Écrit sur la sortie standard la configuration Nginx de SaasClair, à partir du .env.
#   ENV_FILE=/srv/saasclair/.env bash render-nginx.sh > /etc/nginx/sites-available/saasclair.conf
set -euo pipefail
source "$(dirname "$0")/lib.sh"
[ -f "$ENV_FILE" ] || fail "$ENV_FILE introuvable."

sed \
  -e "s|__DOMAIN__|$(env_value DOMAIN)|g" \
  -e "s|__API_DOMAIN__|$(env_value API_DOMAIN)|g" \
  -e "s|__WEB_PORT_BLUE__|$(env_value WEB_PORT_BLUE)|g" \
  -e "s|__WEB_PORT_GREEN__|$(env_value WEB_PORT_GREEN)|g" \
  -e "s|__AUTH_PORT__|$(env_value AUTH_PORT)|g" \
  -e "s|__REST_PORT__|$(env_value REST_PORT)|g" \
  -e "s|__UPSTREAM_HOST__|${UPSTREAM_HOST:-127.0.0.1}|g" \
  -e "s|__ROOT__|${TEMPLATES_ROOT:-$ROOT}|g" \
  "$(dirname "$0")/../nginx/saasclair.conf"
