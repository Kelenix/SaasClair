-- Collecte réelle : les pages vues (et l'identification d'un inscrit) envoyées par le script
-- installé sur le site du client, reçues par /api/collect (ADR-023).

-- Clé du site dans la ligne de script (les 8 premiers caractères de l'identifiant du projet) :
-- retrouvée à chaque visite, donc unique et indexée.
alter table public.projects
  add column site_key text generated always as (left(id::text, 8)) stored;
create unique index projects_site_key_idx on public.projects (site_key);

create table public.events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  type text not null check (type in ('pageview', 'identify')),
  -- Identifiant aléatoire tiré par le script dans le navigateur du visiteur : ni email, ni IP.
  visitor_id text not null check (visitor_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  path text not null default '/' check (length(path) <= 512),
  referrer_host text check (length(referrer_host) <= 255),
  channel text not null check (
    channel in ('seo', 'ads', 'linkedin', 'instagram', 'partners', 'email', 'referral', 'direct')
  ),
  utm_source text check (length(utm_source) <= 100),
  utm_medium text check (length(utm_medium) <= 100),
  utm_campaign text check (length(utm_campaign) <= 150),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  -- Identification d'un inscrit : empreinte SHA-256 de son email, jamais l'email lui-même.
  email_hash text check (email_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.events is
  'Pages vues et identifications envoyées par le script de collecte (écriture : clé de service uniquement).';

create index events_project_time_idx on public.events (project_id, occurred_at desc);

alter table public.events enable row level security;

-- Lecture : chaque client ne voit que les visites de son propre site.
create policy "events_select_own" on public.events
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );

-- Écriture : uniquement par le point de réception (clé de service), jamais depuis un navigateur.
revoke insert, update, delete on public.events from anon, authenticated;
