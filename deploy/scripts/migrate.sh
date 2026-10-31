#!/usr/bin/env bash
# Applique, dans l'ordre, les migrations de supabase/migrations pas encore passées en production.
# Même table de suivi que la CLI Supabase (supabase_migrations.schema_migrations) : un
# `supabase db push --db-url …` lancé plus tard via un tunnel SSH verra le même historique.
# Chaque migration passe dans une transaction ; une sauvegarde est faite avant la première.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

db_psql <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL
applied=$(db_psql -c "select version from supabase_migrations.schema_migrations")

pending=()
for file in "$ROOT"/supabase/migrations/*.sql; do
  base=$(basename "$file" .sql)
  grep -qxF "${base%%_*}" <<<"$applied" || pending+=("$file")
done

if [ ${#pending[@]} -eq 0 ]; then
  log "Base à jour : aucune migration à appliquer."
  exit 0
fi

if [ -n "$applied" ]; then
  bash "$(dirname "$0")/backup.sh" avant-migration
fi

for file in "${pending[@]}"; do
  base=$(basename "$file" .sql)
  version=${base%%_*}
  name=${base#*_}
  log "Migration $base"
  {
    echo "begin;"
    cat "$file"
    echo
    echo "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name');"
    echo "commit;"
  } | db_psql >/dev/null
done
log "${#pending[@]} migration(s) appliquée(s)."
