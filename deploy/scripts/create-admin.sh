#!/usr/bin/env bash
# Crée (ou met à jour) un compte super administrateur en production.
#   bash /srv/saasclair/deploy/scripts/create-admin.sh <email> [prénom]
# Le mot de passe est demandé au clavier, sans s'afficher ; il n'est écrit nulle part.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
[ -n "${1:-}" ] || fail "Usage : create-admin.sh <email> [prénom]"

color=$(active_color)
[ "$color" != none ] || fail "L'application n'est pas en service : déployez-la d'abord."
dc exec -it -e ADMIN_EMAIL="$1" -e ADMIN_FIRST_NAME="${2:-}" "web-$color" \
  node scripts/create-super-admin.mjs
