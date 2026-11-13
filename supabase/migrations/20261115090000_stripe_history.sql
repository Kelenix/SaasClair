-- Revenu exact et historique (lot B2, B4, B5) :
-- - abonnements à paliers ou à l'usage signalés (revenu lu sur leur dernière facture) ;
-- - part récurrente de chaque facture d'abonnement, ramenée au mois, sur la période couverte :
--   l'historique réel du revenu de chaque client (expansion, contraction, cohortes) ;
-- - date du dernier import complet (le suivi horaire ne relit que ce qui a changé).
-- Remplis au premier import complet, lancé par le suivi horaire qui suit la livraison.

alter table public.stripe_subscriptions
  add column price_unknown boolean not null default false;

comment on column public.stripe_subscriptions.price_unknown is
  'Prix par paliers ou à l''usage : le revenu mensuel est lu sur la dernière facture.';

alter table public.stripe_invoices
  add column recurring_cents bigint check (recurring_cents >= 0),
  add column period_start timestamptz,
  add column period_end timestamptz;

comment on column public.stripe_invoices.recurring_cents is
  'Lignes d''abonnement hors prorata, remises déduites, ramenées au mois (null : pas d''abonnement).';

-- Historique d'un abonnement : ses factures, dans l'ordre.
create index stripe_invoices_subscription_idx
  on public.stripe_invoices (project_id, subscription_id, period_start)
  where recurring_cents is not null;

alter table public.projects
  add column stripe_full_synced_at timestamptz;

comment on column public.projects.stripe_full_synced_at is
  'Dernier import complet de Stripe (un par jour au moins ; le suivi horaire repart de stripe_synced_at).';

-- Même protection que les autres champs du lien Stripe : écrit par le serveur seulement.
create or replace function public.protect_stripe_link()
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
      new.stripe_full_synced_at := null;
    else
      new.stripe_account_id := old.stripe_account_id;
      new.stripe_livemode := old.stripe_livemode;
      new.stripe_sync_status := old.stripe_sync_status;
      new.stripe_synced_at := old.stripe_synced_at;
      new.stripe_full_synced_at := old.stripe_full_synced_at;
    end if;
  end if;
  return new;
end;
$$;
