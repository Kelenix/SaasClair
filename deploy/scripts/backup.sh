#!/usr/bin/env bash
# Sauvegarde complète de la base (comptes, abonnements, contenus), compressée, gardée 14 jours.
# Lancée chaque nuit par /etc/cron.d/saasclair et avant chaque migration.
#   backup.sh [étiquette]
# Restauration : docs/runbook.md (« Restaurer une sauvegarde »).
set -euo pipefail
source "$(dirname "$0")/lib.sh"

dir="$ROOT/backups"
mkdir -p "$dir"
chmod 700 "$dir"
file="$dir/saasclair-$(date -u +%Y%m%d-%H%M%S)${1:+-$1}.dump"

dc exec -T db pg_dump -h localhost -U supabase_admin -d postgres -Fc >"$file.part"
mv "$file.part" "$file"
chmod 600 "$file"
find "$dir" -name 'saasclair-*.dump' -mtime +14 -delete
log "Sauvegarde : $file ($(du -h "$file" | cut -f1))"
