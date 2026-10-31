#!/usr/bin/env bash
# Amorçage de SaasClair sur un VPS Ubuntu qui héberge DÉJÀ d'autres sites. À lancer en root, une
# fois (le relancer est sans danger). Prérequis : le dossier /srv/saasclair contient deploy/ et
# supabase/ (copiés par `scp`, voir docs/deployment.md).
#
#   DOMAIN=saasclair.com EMAIL=<email Let's Encrypt> DEPLOY_KEY='<clé publique CI>' \
#     bash /srv/saasclair/deploy/scripts/bootstrap.sh
#
# Ce script n'écrase rien d'existant : ni les autres sites Nginx, ni le site par défaut, ni la
# configuration SSH, ni le pare-feu, ni les autres conteneurs. Il s'arrête net s'il trouve un
# conflit (port occupé, autre serveur web sur le port 80).
set -euo pipefail
: "${DOMAIN:?DOMAIN manquant}" "${EMAIL:?EMAIL manquant}" "${DEPLOY_KEY:?DEPLOY_KEY manquant}"
ROOT=/srv/saasclair
export ROOT
source "$ROOT/deploy/scripts/lib.sh"
[ "$(id -u)" = 0 ] || fail "À lancer en root."
cd "$ROOT" # les commandes lancées en « deploy » ne peuvent pas lire le dossier de root
API_DOMAIN=api.$DOMAIN

# 1. Serveur web : on s'appuie sur Nginx s'il est déjà là ; tout autre serveur sur le port 80
#    (Caddy, Traefik, Apache…) demande une intégration à la main.
holder=$(ss -ltnpH '( sport = :80 )' | sed -nE 's/.*users:\(\("([^"]+)".*/\1/p' | head -1)
if [ -n "$holder" ] && [ "$holder" != nginx ]; then
  fail "Le port 80 est tenu par « $holder », pas par Nginx : intégration manuelle nécessaire (docs/deployment.md)."
fi

# 2. Paquets manquants uniquement (aucune mise à niveau générale : les autres sites ne bougent pas).
export DEBIAN_FRONTEND=noninteractive
missing=()
command -v docker >/dev/null || missing+=(docker.io)
docker compose version >/dev/null 2>&1 || missing+=(docker-compose-v2)
command -v nginx >/dev/null || missing+=(nginx)
command -v certbot >/dev/null || missing+=(certbot python3-certbot-nginx)
dpkg -s python3-certbot-nginx >/dev/null 2>&1 || missing+=(python3-certbot-nginx)
if [ ${#missing[@]} -gt 0 ]; then
  log "Installation : ${missing[*]}"
  apt-get update -q
  apt-get install -yq "${missing[@]}"
fi

# 3. Ports internes de SaasClair : libres, ou déjà tenus par SaasClair (relance du script).
ours=$(docker ps --filter label=com.docker.compose.project=saasclair -q | wc -l)
if [ "$ours" -eq 0 ]; then
  for var in WEB_PORT_BLUE WEB_PORT_GREEN AUTH_PORT REST_PORT DB_PORT; do
    port=$( [ -f "$ENV_FILE" ] && env_value "$var" || true )
    port=${port:-$(grep -oE "$var:-[0-9]+" "$ROOT/deploy/scripts/gen-env.sh" | cut -d- -f2)}
    if ss -ltnH "( sport = :$port )" | grep -q .; then
      fail "Port $port ($var) déjà occupé : choisissez-en un autre (variable $var, docs/deployment.md)."
    fi
  done
fi

# 4. Utilisateur « deploy » pour la CD : clé dédiée, sans mot de passe, sans redirection SSH.
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
keys=/home/deploy/.ssh/authorized_keys
touch "$keys"
grep -qF "$DEPLOY_KEY" "$keys" || echo "restrict $DEPLOY_KEY" >>"$keys"
chown deploy:deploy "$keys"
chmod 600 "$keys"

# 5. Dossier de l'application (lisible par Nginx pour les modèles d'emails, .env privé).
chown -R deploy:deploy "$ROOT"
chmod 755 "$ROOT"
install -d -m 700 -o deploy -g deploy "$ROOT/backups"
if [ ! -s "$ENV_FILE" ]; then
  sudo -u deploy DOMAIN="$DOMAIN" ENV_FILE="$ENV_FILE" bash "$ROOT/deploy/scripts/gen-env.sh" >/dev/null
fi
chmod 600 "$ENV_FILE"

# 6. Supabase (base, Auth, API) puis migrations.
log "Démarrage de Supabase (premier lancement : téléchargement des images)"
sudo -u deploy ROOT="$ROOT" bash -c 'source "$ROOT/deploy/scripts/lib.sh"; dc up -d --wait --wait-timeout 300 db auth rest'
sudo -u deploy ROOT="$ROOT" bash "$ROOT/deploy/scripts/migrate.sh"

# 7. Nginx : un fichier à part pour SaasClair. S'il existe déjà, il est gardé (certbot y a ajouté
#    le HTTPS) ; FORCE_NGINX=1 le régénère, puis certbot y remet les certificats.
site=/etc/nginx/sites-available/saasclair.conf
upstream="$ROOT/nginx/upstream.conf"
if [ ! -f "$upstream" ]; then
  install -d -o deploy -g deploy "$ROOT/nginx"
  printf '# Écrit par deploy.sh : version en service\nserver 127.0.0.1:%s max_fails=0;\n' "$(env_value WEB_PORT_BLUE)" >"$upstream"
  chown deploy:deploy "$upstream"
fi
# « deploy » peut seulement vérifier et recharger Nginx (bascule sans coupure), rien d'autre.
echo 'deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t -q, /usr/sbin/nginx -s reload' >/etc/sudoers.d/saasclair.new
chmod 440 /etc/sudoers.d/saasclair.new
visudo -cf /etc/sudoers.d/saasclair.new >/dev/null
mv /etc/sudoers.d/saasclair.new /etc/sudoers.d/saasclair
if [ ! -f "$site" ] || [ "${FORCE_NGINX:-0}" = 1 ]; then
  bash "$ROOT/deploy/scripts/render-nginx.sh" >"$site.new"
  mv "$site.new" "$site"
fi
if [ -d /etc/nginx/sites-enabled ]; then
  ln -sf "$site" /etc/nginx/sites-enabled/saasclair.conf
else
  ln -sf "$site" /etc/nginx/conf.d/saasclair.conf
fi
nginx -t
systemctl reload nginx

# 8. HTTPS, seulement si les trois noms pointent déjà vers ce serveur.
ip=$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
dns_ok=1
for name in "$DOMAIN" "www.$DOMAIN" "$API_DOMAIN"; do
  resolved=$(getent ahostsv4 "$name" | awk '{print $1; exit}')
  if [ "$resolved" != "$ip" ]; then
    echo "  DNS : $name → ${resolved:-introuvable} (attendu : $ip)"
    dns_ok=0
  fi
done
if [ "$dns_ok" = 1 ]; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" -d "$API_DOMAIN" --cert-name "$DOMAIN" \
    -m "$EMAIL" --agree-tos --non-interactive --redirect --keep-until-expiring
else
  echo "  HTTPS reporté : corrigez les DNS puis relancez ce script."
fi

# 9. Pare-feu : seulement s'il est déjà actif (on ne l'active pas à la place de l'administrateur).
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full' >/dev/null
fi

# 10. Sauvegarde chaque nuit à 3 h 15 (14 jours gardés, dans $ROOT/backups).
cat >/etc/cron.d/saasclair <<EOF
# SaasClair : sauvegarde quotidienne de la base (deploy/scripts/backup.sh)
15 3 * * * deploy ROOT=$ROOT bash $ROOT/deploy/scripts/backup.sh >>$ROOT/backups/backup.log 2>&1
EOF

log "SaasClair amorcé."
echo "VPS_FINGERPRINT=$(ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub | cut -d' ' -f2)"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(env_value ANON_KEY)"
