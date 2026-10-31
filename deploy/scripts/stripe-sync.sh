#!/usr/bin/env bash
# Resynchronise chaque heure les comptes Stripe connectés (lancé par /etc/cron.d/saasclair).
# Appelle directement la version en service (127.0.0.1), avec le secret CRON_SECRET du .env :
# rien ne transite par Internet, et le secret ne figure dans aucun fichier lisible par tous.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

secret=$(env_value CRON_SECRET)
[ -n "$secret" ] || fail "CRON_SECRET absent de $ENV_FILE."
color=$(active_color)
[ "$color" != none ] || fail "Aucune version de l'application en service."
port=$(env_value "WEB_PORT_${color^^}")

status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 -X POST \
  -H "Authorization: Bearer $secret" "http://127.0.0.1:$port/api/stripe/sync")
case "$status" in
  202) log "Resynchronisation Stripe lancée ($(date -u +%Y-%m-%dT%H:%MZ))." ;;
  503) log "Stripe non configuré : rien à resynchroniser." ;;
  *) fail "Resynchronisation Stripe refusée (HTTP $status)." ;;
esac
