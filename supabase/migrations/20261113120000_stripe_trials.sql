-- Dates d'essai et de résiliation programmée des abonnements des clients (Stripe Connect).
-- Sans elles, un essai annulé était compté comme du revenu, puis comme un départ (churn gonflé),
-- et une résiliation programmée à une date précise (cancel_at) n'apparaissait pas à risque.
-- Remplies à la prochaine resynchronisation horaire (import complet).
alter table public.stripe_subscriptions
  add column trial_end timestamptz,
  add column cancel_at timestamptz;

comment on column public.stripe_subscriptions.trial_end is
  'Fin de l''essai gratuit : le revenu ne compte qu''à partir de cette date.';
comment on column public.stripe_subscriptions.cancel_at is
  'Résiliation programmée à une date précise (en plus de cancel_at_period_end).';
