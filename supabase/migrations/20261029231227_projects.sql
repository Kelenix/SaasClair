-- Un « projet » = le SaaS suivi par un compte (un seul par compte au MVP, .docx F6).
-- Il porte l'avancement de la configuration en 2 actions : script installé, puis Stripe connecté.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  site_url text not null check (site_url ~ '^https?://[^/\s]+$'),
  audit jsonb,
  script_detected_at timestamptz,
  stripe_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'SaaS suivi et avancement de sa configuration (2 actions obligatoires).';

-- L'ordre des étapes est garanti par la base : pas de Stripe sans script.
alter table public.projects
  add constraint projects_steps_in_order
  check (stripe_connected_at is null or script_detected_at is not null);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Chaque compte ne voit et ne modifie que son projet. Suppression : via les paramètres (incrément 7).
alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
