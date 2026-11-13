-- « Je n'utilise pas Stripe » (configuration, question fermée) : la réponse est enregistrée,
-- pour prévenir l'utilisateur dès que Paddle ou Lemon Squeezy sera disponible (liste d'attente).
alter table public.projects
  add column billing_provider text check (billing_provider in ('paddle', 'lemonsqueezy', 'none'));

comment on column public.projects.billing_provider is
  'Moyen de paiement déclaré quand ce n''est pas Stripe : paddle, lemonsqueezy, ou none (pas encore de paiements).';
