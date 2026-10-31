#!/usr/bin/env bash
# Crée le fichier .env de production avec des secrets neufs (une seule fois : un fichier existant
# n'est jamais écrasé, sinon les comptes et les données deviendraient illisibles).
#
#   DOMAIN=saasclair.com ENV_FILE=/srv/saasclair/.env bash gen-env.sh
#
# Les secrets naissent sur le serveur et n'en sortent pas. Seule la clé publique ANON_KEY
# (déjà visible dans le navigateur de chaque visiteur) est affichée, pour la construction de l'image.
set -euo pipefail
: "${DOMAIN:?DOMAIN manquant}" "${ENV_FILE:?ENV_FILE manquant}"
API_DOMAIN=${API_DOMAIN:-api.$DOMAIN}
SCHEME=${SCHEME:-https}
PUBLIC_PORT=${PUBLIC_PORT:-}

if [ -s "$ENV_FILE" ]; then
  echo "• $ENV_FILE existe déjà : conservé."
  exit 0
fi

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
jwt() {
  local now exp header payload sig
  now=$(date +%s)
  exp=$((now + 10 * 365 * 24 * 3600))
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$1" "$now" "$exp" | b64url)
  sig=$(printf '%s' "$header.$payload" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64url)
  printf '%s' "$header.$payload.$sig"
}

POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
ANON_KEY=$(jwt anon)
SERVICE_ROLE_KEY=$(jwt service_role)
suffix=${PUBLIC_PORT:+:$PUBLIC_PORT}

umask 077
mkdir -p "$(dirname "$ENV_FILE")"
cat > "$ENV_FILE" <<EOF
# SaasClair — production. Créé le $(date -u +%Y-%m-%dT%H:%MZ) par deploy/scripts/gen-env.sh.
# Ne jamais copier ce fichier ailleurs ni le commiter. Modifier une valeur, puis :
#   bash /srv/saasclair/deploy/scripts/deploy.sh --restart
DOMAIN=$DOMAIN
API_DOMAIN=$API_DOMAIN
SITE_URL=$SCHEME://$DOMAIN$suffix
API_EXTERNAL_URL=$SCHEME://$API_DOMAIN$suffix

# Secrets (générés ici, jamais transmis à GitHub)
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
# Resynchronisation horaire de Stripe (deploy/scripts/stripe-sync.sh)
CRON_SECRET=$CRON_SECRET
# Clé publique (présente dans le site) : variable GitHub NEXT_PUBLIC_SUPABASE_ANON_KEY
ANON_KEY=$ANON_KEY

# Ports internes, liés à 127.0.0.1 (registre des ports : docs/deployment.md)
WEB_PORT_BLUE=${WEB_PORT_BLUE:-3110}
WEB_PORT_GREEN=${WEB_PORT_GREEN:-3111}
AUTH_PORT=${AUTH_PORT:-3120}
REST_PORT=${REST_PORT:-3121}
DB_PORT=${DB_PORT:-3130}

# Emails d'authentification (mot de passe oublié) — docs/manual-tasks.md, tâche n° 11
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SENDER=no-reply@$DOMAIN

# Connexion Stripe de vos clients (OAuth Connect, lecture seule) — docs/deployment.md
STRIPE_SECRET_KEY=
STRIPE_CONNECT_CLIENT_ID=

# Connexion Google / GitHub (facultatif) — docs/configuration.md
GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_SECRET=
GITHUB_ENABLED=false
GITHUB_CLIENT_ID=
GITHUB_SECRET=
EOF
echo "• $ENV_FILE créé (secrets neufs, lecture réservée au propriétaire)."
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY"
