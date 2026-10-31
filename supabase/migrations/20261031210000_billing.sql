-- Paiement de l'abonnement SaasClair (Stripe Billing, ADR-027) : le client et l'abonnement Stripe
-- rattachés au profil, mis à jour uniquement par le serveur (notifications signées de Stripe).
-- Les profils ne sont déjà modifiables que par le super administrateur (RLS).

alter table public.profiles
  add column stripe_customer_id text unique check (stripe_customer_id ~ '^cus_'),
  add column stripe_subscription_id text unique check (stripe_subscription_id ~ '^sub_'),
  add column cancel_at_period_end boolean not null default false;

-- Notifications de Stripe déjà traitées : une notification renvoyée n'est jamais appliquée deux
-- fois. Écriture et lecture : clé de service uniquement (aucune politique pour les comptes).
create table public.billing_events (
  id text primary key check (id ~ '^evt_'),
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;
