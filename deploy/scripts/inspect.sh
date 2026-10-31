#!/usr/bin/env bash
# État du serveur, en LECTURE SEULE (aucune modification) : à lancer avant l'amorçage pour
# vérifier que SaasClair peut s'installer sans gêner les sites déjà en ligne.
#   DOMAIN=saasclair.com bash inspect.sh
DOMAIN=${DOMAIN:-saasclair.com}
PORTS=${PORTS:-"3110 3111 3120 3121 3130"}
title() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

title "Système"
. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"
echo "Processeurs : $(nproc)"
free -h | sed -n '1,2p'
df -h / | tail -1 | awk '{print "Disque / : " $3 " utilisés sur " $2 " (" $5 ")"}'
swapon --show 2>/dev/null | tail -n +2 | sed 's/^/Swap : /' || true

title "Ports en écoute (publics et locaux)"
ss -ltnpH 2>/dev/null | awk '{print $4, $6}' | sed -E 's/users:\(\("([^"]+)".*/\1/' | sort -u

title "Qui tient les ports 80 et 443 ?"
ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null | sed -E 's/.*users:\(\("([^"]+)".*/\1/' | sort -u

title "Ports prévus pour SaasClair ($PORTS)"
for port in $PORTS; do
  if ss -ltnH "( sport = :$port )" | grep -q .; then echo "$port : OCCUPÉ"; else echo "$port : libre"; fi
done

title "Docker"
if command -v docker >/dev/null; then
  docker --version
  docker compose version 2>/dev/null || echo "docker compose : absent"
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
  docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}' 2>/dev/null | head -20
else
  echo "Docker absent"
fi

title "Nginx"
if command -v nginx >/dev/null; then
  nginx -v 2>&1
  ls /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
  grep -rhoE 'server_name[^;]+' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | sort -u
  nginx -t 2>&1 | tail -1
else
  echo "Nginx absent"
fi
for other in caddy traefik apache2 httpd; do
  pgrep -x "$other" >/dev/null && echo "Attention : $other est aussi en service"
done

title "Certificats"
command -v certbot >/dev/null && certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry' || echo "certbot absent"

title "Pare-feu"
command -v ufw >/dev/null && ufw status | head -12 || echo "ufw absent"

title "DNS de $DOMAIN"
ip=$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "Adresse de ce serveur : $ip"
for name in "$DOMAIN" "www.$DOMAIN" "api.$DOMAIN"; do
  resolved=$(getent ahostsv4 "$name" | awk '{print $1; exit}')
  [ "$resolved" = "$ip" ] && state="OK" || state="à corriger"
  echo "$name → ${resolved:-introuvable} ($state)"
done

title "SaasClair"
[ -d /srv/saasclair ] && ls -la /srv/saasclair || echo "Pas encore installé"
