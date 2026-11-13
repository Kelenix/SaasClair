-- Signaux de risque supplémentaires pour les clients des utilisateurs (score de churn, lot C5) :
-- rythme de facturation (renouvellement annuel proche) et expiration de la carte de paiement
-- (paiement qui échouera au prochain prélèvement). Remplis à la prochaine resynchronisation.
-- Aucune donnée de carte n'est gardée en dehors du mois d'expiration.
alter table public.stripe_subscriptions
  add column billing_interval text check (billing_interval in ('day', 'week', 'month', 'year')),
  add column card_expires_at timestamptz;

comment on column public.stripe_subscriptions.billing_interval is
  'Rythme de facturation de la première ligne (month, year…).';
comment on column public.stripe_subscriptions.card_expires_at is
  'Fin du mois d''expiration de la carte qui paie cet abonnement (sinon celle du client).';
