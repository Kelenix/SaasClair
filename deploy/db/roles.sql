-- Exécuté une seule fois, à la création de la base (docker-entrypoint-initdb.d).
-- Les services Auth et API de données se connectent avec ces rôles, créés par l'image Supabase.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user postgres with password :'pgpass';
