-- Espace super administrateur : profils et rôles, provenance des inscrits, abonnements,
-- contenus du site (FAQ, témoignages, À propos), newsletter, réglages et journal d'activité.

create type public.app_role as enum ('user', 'super_admin');
create type public.plan_id as enum ('trial', 'starter', 'growth', 'pro');
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'suspended'
);
create type public.payment_method as enum ('card', 'sepa', 'paypal', 'bank_transfer');
create type public.billing_interval as enum ('monthly', 'annual');

-- ---------------------------------------------------------------------------------------------
-- Profils : une ligne par compte, créée automatiquement à l'inscription.
-- ---------------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  role public.app_role not null default 'user',
  plan public.plan_id not null default 'trial',
  billing_interval public.billing_interval,
  payment_method public.payment_method,
  -- Offre Pro : prix négocié (sur devis), en euros par mois.
  custom_monthly_price integer check (custom_monthly_price between 0 and 100000),
  subscription_status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz not null default now() + interval '14 days',
  current_period_end timestamptz,
  -- Provenance au premier passage sur le site (UTM et site référent).
  signup_channel text not null default 'direct' check (
    signup_channel in ('seo', 'ads', 'linkedin', 'instagram', 'partners', 'email', 'referral', 'direct')
  ),
  signup_source text check (char_length(signup_source) <= 100),
  signup_medium text check (char_length(signup_medium) <= 100),
  signup_campaign text check (char_length(signup_campaign) <= 150),
  signup_referrer text check (char_length(signup_referrer) <= 200),
  signup_landing text check (char_length(signup_landing) <= 200),
  last_sign_in_at timestamptz,
  last_seen_at timestamptz,
  admin_note text check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Compte, rôle, abonnement et provenance de chaque utilisateur.';

create index profiles_created_at_idx on public.profiles (created_at desc);
create index profiles_last_seen_idx on public.profiles (last_seen_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

/** Canal reconnu, sinon « referral » (un autre site) ou « direct ». */
create function public.clean_channel(value text, referrer text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when value in ('seo', 'ads', 'linkedin', 'instagram', 'partners', 'email', 'referral', 'direct')
      then value
    when coalesce(referrer, '') <> '' then 'referral'
    else 'direct'
  end;
$$;

-- Création du profil à l'inscription, avec la provenance transmise par le formulaire.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, email, first_name, signup_channel, signup_source, signup_medium, signup_campaign,
    signup_referrer, signup_landing, last_sign_in_at, created_at
  ) values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(meta ->> 'first_name', meta ->> 'given_name', ''), 80),
    public.clean_channel(meta ->> 'signup_channel', meta ->> 'signup_referrer'),
    left(meta ->> 'signup_source', 100),
    left(meta ->> 'signup_medium', 100),
    left(meta ->> 'signup_campaign', 150),
    left(meta ->> 'signup_referrer', 200),
    left(meta ->> 'signup_landing', 200),
    new.last_sign_in_at,
    new.created_at
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dernière connexion et email tenus à jour depuis le compte.
create function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set last_sign_in_at = new.last_sign_in_at,
         email = coalesce(new.email, email)
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of last_sign_in_at, email on auth.users
  for each row execute function public.sync_profile_from_auth();

-- Comptes existants avant cette migration.
insert into public.profiles (id, email, first_name, last_sign_in_at, created_at)
select id, coalesce(email, ''), left(coalesce(raw_user_meta_data ->> 'first_name', ''), 80),
       last_sign_in_at, created_at
  from auth.users
on conflict (id) do nothing;

/** Vrai si l'utilisateur courant est super administrateur (sans récursion dans les politiques). */
create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid()) and role = 'super_admin'
  );
$$;

/** « Vu à l'instant » : au plus une écriture par minute et par utilisateur. */
create function public.touch_last_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set last_seen_at = now()
   where id = (select auth.uid())
     and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
$$;

/**
 * Provenance d'une inscription par Google ou GitHub : posée au retour, une seule fois, et
 * seulement dans l'heure qui suit la création du compte.
 */
create function public.claim_signup_attribution(
  channel text, source text, medium text, campaign text, referrer text, landing text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set signup_channel = public.clean_channel(channel, referrer),
         signup_source = nullif(left(source, 100), ''),
         signup_medium = nullif(left(medium, 100), ''),
         signup_campaign = nullif(left(campaign, 150), ''),
         signup_referrer = nullif(left(referrer, 200), ''),
         signup_landing = nullif(left(landing, 200), '')
   where id = (select auth.uid())
     and created_at > now() - interval '1 hour'
     and signup_channel = 'direct'
     and signup_source is null;
$$;

alter table public.profiles enable row level security;

-- Chacun lit son profil ; le super administrateur lit et gère tous les profils.
-- Aucune modification par l'utilisateur lui-même (pas d'élévation de rôle possible).
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.is_super_admin()));

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- Le super administrateur voit aussi les projets (configuration des clients).
create policy "projects_select_admin" on public.projects
  for select to authenticated using ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------------------------
-- Contenus du site vitrine, modifiables par le super administrateur.
-- ---------------------------------------------------------------------------------------------

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 200),
  answer text not null check (char_length(answer) between 10 and 1200),
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(quote) between 10 and 600),
  author text not null check (char_length(author) between 2 and 80),
  role text not null default '' check (char_length(role) <= 120),
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_pages (
  slug text primary key check (slug in ('a-propos')),
  title text not null check (char_length(title) between 2 and 120),
  intro text not null default '' check (char_length(intro) <= 400),
  body text not null default '' check (char_length(body) <= 8000),
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger faq_items_set_updated_at before update on public.faq_items
  for each row execute function public.set_updated_at();
create trigger testimonials_set_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();
create trigger site_pages_set_updated_at before update on public.site_pages
  for each row execute function public.set_updated_at();

alter table public.faq_items enable row level security;
alter table public.testimonials enable row level security;
alter table public.site_pages enable row level security;

-- Lecture publique de ce qui est publié ; tout le reste réservé au super administrateur.
create policy "faq_items_read" on public.faq_items for select to anon, authenticated
  using (is_published or (select public.is_super_admin()));
create policy "faq_items_admin_write" on public.faq_items for all to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

create policy "testimonials_read" on public.testimonials for select to anon, authenticated
  using (is_published or (select public.is_super_admin()));
create policy "testimonials_admin_write" on public.testimonials for all to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

create policy "site_pages_read" on public.site_pages for select to anon, authenticated
  using (is_published or (select public.is_super_admin()));
create policy "site_pages_admin_write" on public.site_pages for all to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- Contenu de départ : la FAQ du site et une page À propos à relire.
insert into public.faq_items (question, answer, position) values
  ('Dois-je configurer quelque chose ?',
   'Non. Vous collez une ligne de code et vous connectez Stripe. Canaux, tunnel, scores de risque et alertes sont calculés automatiquement. Si nous avons un doute, nous vous posons une question à laquelle vous répondez en un clic.', 1),
  ('Faut-il un développeur pour installer le script ?',
   'Non. Sur WordPress, Webflow ou Shopify, l''installation se fait sans code. Sinon, vous pouvez envoyer les instructions à votre développeur en un clic.', 2),
  ('Pouvez-vous modifier mon compte Stripe ?',
   'Non. L''accès est en lecture seule : nous lisons vos clients, paiements et abonnements, sans pouvoir rien changer.', 3),
  ('Mes données et celles de mes clients sont-elles protégées ?',
   'Oui. Hébergement en Europe, adresses IP anonymisées, emails chiffrés avant d''être comparés. Vous pouvez supprimer toutes vos données à tout moment.', 4),
  ('Combien de temps avant les premiers résultats ?',
   'Vos chiffres de revenu et de churn apparaissent dès la connexion de Stripe. Les premières recommandations arrivent sous 24 heures.', 5),
  ('Et si j''utilise Paddle ou Lemon Squeezy ?',
   'Ils arrivent bientôt, avec la même connexion en un clic. Inscrivez-vous : nous vous prévenons dès leur ouverture.', 6);

insert into public.site_pages (slug, title, intro, body) values (
  'a-propos',
  'Comprendre son SaaS ne devrait pas prendre 5 semaines.',
  'SaasClair aide les créateurs de SaaS à savoir d''où viennent leurs clients, pourquoi leurs visiteurs n''achètent pas et qui va partir, sans rien configurer.',
  'Les outils d''analyse parlent d''événements, de propriétés et de segments. Les fondateurs, eux, parlent de clients, d''euros et de décisions.

Nous avons construit SaasClair pour combler cet écart : deux actions pour l''installer, puis des réponses claires, chiffrées en euros, avec l''action à mener.

Notre règle : configuration zéro. Quand l''outil a un doute, il vous pose une question à laquelle vous répondez en un clic.'
);

-- ---------------------------------------------------------------------------------------------
-- Newsletter : inscription publique depuis le pied de page, gestion par le super administrateur.
-- ---------------------------------------------------------------------------------------------

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (
    email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254
  ),
  source text not null default 'pied-de-page' check (char_length(source) <= 40),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy "newsletter_subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated with check (unsubscribed_at is null);
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select to authenticated using ((select public.is_super_admin()));
create policy "newsletter_admin_update" on public.newsletter_subscribers
  for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy "newsletter_admin_delete" on public.newsletter_subscribers
  for delete to authenticated using ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------------------------
-- Réglages du site : identifiants publicitaires (publics par nature) et contact.
-- ---------------------------------------------------------------------------------------------

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  google_ads_id text check (google_ads_id ~ '^AW-[0-9]{6,15}$'),
  google_ads_conversion_label text check (google_ads_conversion_label ~ '^[A-Za-z0-9_-]{4,64}$'),
  ga4_id text check (ga4_id ~ '^G-[A-Z0-9]{4,15}$'),
  meta_pixel_id text check (meta_pixel_id ~ '^[0-9]{8,20}$'),
  linkedin_partner_id text check (linkedin_partner_id ~ '^[0-9]{4,12}$'),
  contact_email text check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings_read" on public.site_settings for select to anon, authenticated
  using (true);
create policy "site_settings_admin_update" on public.site_settings for update to authenticated
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));

-- ---------------------------------------------------------------------------------------------
-- Journal des actions du super administrateur.
-- ---------------------------------------------------------------------------------------------

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid default auth.uid() references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  target text check (char_length(target) <= 200),
  details jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "audit_admin_read" on public.admin_audit_log
  for select to authenticated using ((select public.is_super_admin()));
create policy "audit_admin_insert" on public.admin_audit_log
  for insert to authenticated
  with check ((select public.is_super_admin()) and actor_id = (select auth.uid()));

/** État de la base pour l'écran « État du système » (super administrateur uniquement). */
create function public.admin_system_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Accès réservé au super administrateur' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'database_size', pg_database_size(current_database()),
    'postgres_version', current_setting('server_version'),
    'migrations', (
      select coalesce(jsonb_agg(version order by version), '[]'::jsonb)
        from supabase_migrations.schema_migrations
    ),
    'tables', jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'projects', (select count(*) from public.projects),
      'insight_feedback', (select count(*) from public.insight_feedback),
      'alert_settings', (select count(*) from public.alert_settings),
      'newsletter_subscribers', (select count(*) from public.newsletter_subscribers),
      'faq_items', (select count(*) from public.faq_items),
      'testimonials', (select count(*) from public.testimonials),
      'admin_audit_log', (select count(*) from public.admin_audit_log)
    )
  );
end;
$$;

-- Fonctions appelables seulement par un compte connecté (jamais par un visiteur anonyme).
revoke execute on function public.admin_system_stats() from public, anon;
revoke execute on function public.touch_last_seen() from public, anon;
revoke execute on function public.claim_signup_attribution(text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_system_stats() to authenticated;
grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.claim_signup_attribution(text, text, text, text, text, text) to authenticated;
