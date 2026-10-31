-- Connexion Stripe réelle, en lecture seule (OAuth Stripe Connect, ADR-024) : le compte Stripe
-- relié au projet, puis ses clients, abonnements et factures, importés par le serveur.
-- Lecture : le propriétaire du projet uniquement. Écriture : la clé de service uniquement.

alter table public.projects
  add column stripe_account_id text unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  add column stripe_livemode boolean,
  -- Avancement de l'import, lu par l'étape « Connecter Stripe » pendant qu'il tourne.
  add column stripe_sync_status text check (stripe_sync_status in ('importing', 'done', 'error')),
  add column stripe_synced_at timestamptz;

create table public.stripe_customers (
  project_id uuid not null references public.projects (id) on delete cascade,
  id text not null check (id ~ '^cus_'),
  name text check (length(name) <= 200),
  email text check (length(email) <= 320),
  -- Empreinte SHA-256 de l'email : relie le client à son identification par le script.
  email_hash text check (email_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null,
  primary key (project_id, id)
);

create table public.stripe_subscriptions (
  project_id uuid not null references public.projects (id) on delete cascade,
  id text not null check (id ~ '^sub_'),
  customer_id text not null,
  status text not null,
  -- Revenu mensuel récurrent de l'abonnement, en centimes (annuel ÷ 12, etc.).
  mrr_cents bigint not null default 0 check (mrr_cents >= 0),
  currency text not null default 'eur',
  plan_name text check (length(plan_name) <= 200),
  created_at timestamptz not null,
  canceled_at timestamptz,
  ended_at timestamptz,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  primary key (project_id, id)
);
create index stripe_subscriptions_customer_idx on public.stripe_subscriptions (project_id, customer_id);

create table public.stripe_invoices (
  project_id uuid not null references public.projects (id) on delete cascade,
  id text not null check (id ~ '^in_'),
  customer_id text,
  subscription_id text,
  status text not null,
  amount_due_cents bigint not null default 0,
  amount_paid_cents bigint not null default 0,
  currency text not null default 'eur',
  attempt_count integer not null default 0,
  created_at timestamptz not null,
  next_payment_attempt timestamptz,
  primary key (project_id, id)
);
create index stripe_invoices_created_idx on public.stripe_invoices (project_id, created_at desc);

alter table public.stripe_customers enable row level security;
alter table public.stripe_subscriptions enable row level security;
alter table public.stripe_invoices enable row level security;

create policy "stripe_customers_select_own" on public.stripe_customers
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "stripe_subscriptions_select_own" on public.stripe_subscriptions
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "stripe_invoices_select_own" on public.stripe_invoices
  for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid())));

revoke insert, update, delete on public.stripe_customers, public.stripe_subscriptions,
  public.stripe_invoices from anon, authenticated;

-- Le compte Stripe relié n'est écrit que par le serveur (retour de Stripe, import) : la politique
-- « projects_update_own » laisserait sinon un utilisateur y mettre le compte d'un autre et bloquer
-- son vrai propriétaire. Toute autre écriture de ces colonnes est ignorée.
create function public.protect_stripe_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', 'service_role') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.stripe_account_id := null;
      new.stripe_livemode := null;
      new.stripe_sync_status := null;
      new.stripe_synced_at := null;
    else
      new.stripe_account_id := old.stripe_account_id;
      new.stripe_livemode := old.stripe_livemode;
      new.stripe_sync_status := old.stripe_sync_status;
      new.stripe_synced_at := old.stripe_synced_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger projects_protect_stripe_link
  before insert or update on public.projects
  for each row execute function public.protect_stripe_link();
