#!/usr/bin/env bash
# Retire l'application d'authentification d'un super administrateur (téléphone perdu ou changé).
# À sa prochaine connexion à l'administration, il en reliera une nouvelle (QR code).
#   sudo -u deploy bash /srv/saasclair/deploy/scripts/reset-admin-2fa.sh <email>
# Réservé à l'accès SSH au serveur : jamais possible depuis le site, même avec le mot de passe.
set -euo pipefail
source "$(dirname "$0")/lib.sh"
email="${1:-}"
[ -n "$email" ] || fail "Usage : reset-admin-2fa.sh <email>"
[[ "$email" =~ ^[^[:space:]\'\"\]+@[^[:space:]\'\"\]+$ ]] || fail "Adresse email invalide."

removed=$(db_psql -v email="$email" <<'SQL'
with target as (
  select u.id from auth.users u
  join public.profiles p on p.id = u.id and p.role = 'super_admin'
  where lower(u.email) = lower(:'email')
), gone as (
  delete from auth.mfa_factors f using target t where f.user_id = t.id returning f.id
)
select count(*) from gone;
SQL
)
log "Applications retirées pour $email : $removed. Reconnectez-vous à /admin pour en relier une nouvelle."
