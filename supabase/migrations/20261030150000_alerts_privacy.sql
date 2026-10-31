-- Alertes activées par défaut et réglages de confidentialité (CLAUDE.md §5.4, incrément 7).

-- Une ligne par compte, créée au premier changement : sans ligne, toutes les alertes sont actives
-- et arrivent par email. On enregistre donc les alertes désactivées, jamais les activées.
create table public.alert_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  disabled_alerts text[] not null default '{}' check (cardinality(disabled_alerts) <= 20),
  email_enabled boolean not null default true,
  -- Slack : webhook entrant fourni par l'utilisateur ; absent = Slack non utilisé.
  slack_webhook_url text check (
    slack_webhook_url ~ '^https://hooks\.slack\.com/services/[A-Za-z0-9_/-]{10,200}$'
  ),
  updated_at timestamptz not null default now()
);

comment on table public.alert_settings is 'Alertes désactivées et canaux de réception de chaque compte.';

create trigger alert_settings_set_updated_at
  before update on public.alert_settings
  for each row execute function public.set_updated_at();

alter table public.alert_settings enable row level security;

create policy "alert_settings_select_own" on public.alert_settings
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy "alert_settings_insert_own" on public.alert_settings
  for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy "alert_settings_update_own" on public.alert_settings
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- Confidentialité : visiteurs anonymisés par défaut (pas d'adresse IP conservée).
alter table public.projects
  add column anonymize_visitors boolean not null default true;

-- Suppression du projet depuis les paramètres : chacun ne peut supprimer que le sien.
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = owner_id);
