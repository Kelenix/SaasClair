#!/usr/bin/env bash
# Installe la facturation de SaasClair dans le compte Stripe du .env (produits, prix, point de
# réception des notifications, portail client), puis reporte les secrets obtenus dans le .env
# sans jamais les afficher, et relance l'application. Relançable sans risque.
#   sudo -u deploy bash /srv/saasclair/deploy/scripts/billing-setup.sh
set -euo pipefail
source "$(dirname "$0")/lib.sh"

color=$(active_color)
[ "$color" != none ] || fail "L'application n'est pas en service."

output=$(dc exec -T -e STRIPE_PORTAL_CONFIGURATION="$(env_value STRIPE_PORTAL_CONFIGURATION)" \
  "web-$color" node scripts/billing-setup.mjs)

# Lignes lisibles affichées ; les « CLÉ=valeur » vont dans le .env, sans être montrées.
grep -v '^[A-Z_]*=' <<<"$output" || true
changed=0
for name in STRIPE_WEBHOOK_SECRET STRIPE_CONNECT_WEBHOOK_SECRET STRIPE_PORTAL_CONFIGURATION; do
  value=$(grep "^$name=" <<<"$output" | tail -1 | cut -d= -f2- || true)
  [ -n "$value" ] || continue
  if grep -q "^$name=" "$ENV_FILE"; then
    sed -i "s|^$name=.*|$name=$value|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$name" "$value" >>"$ENV_FILE"
  fi
  log "$name enregistré dans le .env."
  changed=1
done
if [ "$changed" = 1 ]; then
  bash "$(dirname "$0")/deploy.sh" --restart
fi
