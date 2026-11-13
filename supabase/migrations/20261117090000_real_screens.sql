-- Écrans entièrement réels (lot E) :
-- - raisons de départ tirées de Stripe (observée : demande, paiement échoué, litige ; déclarée :
--   réponse du client au portail de résiliation) ;
-- - tunnel prolongé jusqu'à l'essai et au paiement (inscrits reliés à leur client Stripe) ;
-- - alertes envoyées une seule fois chacune (journal des envois).

alter table public.stripe_subscriptions
  add column cancel_reason text check (length(cancel_reason) <= 40),
  add column cancel_feedback text check (length(cancel_feedback) <= 40),
  add column cancel_comment text check (length(cancel_comment) <= 500);

comment on column public.stripe_subscriptions.cancel_reason is
  'Raison observée par Stripe : cancellation_requested, payment_failed, payment_disputed.';
comment on column public.stripe_subscriptions.cancel_feedback is
  'Raison déclarée par le client au portail de résiliation Stripe (too_expensive, unused…).';

-- Inscrits identifiés (empreinte d'email) → client Stripe du même projet.
create index stripe_customers_email_hash_idx
  on public.stripe_customers (project_id, email_hash)
  where email_hash is not null;

-- Tunnel : mêmes groupes qu'avant, avec deux étapes de plus quand Stripe est connecté, et une fin
-- de période facultative (comparer deux semaines pour l'alerte « baisse de conversion »).
drop function public.funnel_summary(uuid, timestamptz, text, text);
create function public.funnel_summary(
  p_project uuid,
  p_since timestamptz,
  p_pricing text,
  p_signup text,
  p_until timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with rows as (
    select e.id, e.visitor_id, e.occurred_at, e.type, e.path, e.device, e.channel, e.email_hash
    from public.events e
    where e.project_id = p_project and e.occurred_at >= p_since
      and (p_until is null or e.occurred_at < p_until)
  ),
  firsts as (
    select distinct on (r.visitor_id) r.visitor_id, r.device, r.channel
    from rows r
    order by r.visitor_id, r.occurred_at, r.id
  ),
  -- Étapes atteintes : page clé (elle-même ou une sous-page) vue, ou identification reçue.
  reached as (
    select r.visitor_id,
      -- Page clé inconnue : chaîne vide (ou « / », qui ne dit rien).
      coalesce(bool_or(r.type = 'pageview' and coalesce(p_pricing, '') not in ('', '/')
        and (r.path = p_pricing or starts_with(r.path, p_pricing || '/'))), false) as pricing,
      coalesce(bool_or(r.type = 'pageview' and coalesce(p_signup, '') not in ('', '/')
        and (r.path = p_signup or starts_with(r.path, p_signup || '/'))), false) as signup,
      bool_or(r.type = 'identify') as identified
    from rows r
    group by r.visitor_id
  ),
  -- Inscrit relié à son client Stripe (même empreinte d'email) : essai démarré, puis payant.
  linked as (
    select r.visitor_id,
      bool_or(s.trial_end is not null) as trial,
      bool_or(s.status not in ('incomplete', 'incomplete_expired', 'trialing', 'paused')
        and (s.trial_end is null or s.ended_at is null or s.ended_at > s.trial_end)) as paid
    from rows r
    join public.stripe_customers c on c.project_id = p_project and c.email_hash = r.email_hash
    join public.stripe_subscriptions s on s.project_id = p_project and s.customer_id = c.id
    where r.type = 'identify' and r.email_hash is not null
    group by r.visitor_id
  ),
  groups as (
    select f.device, f.channel, x.pricing, x.signup, x.identified,
           coalesce(l.trial, false) as trial, coalesce(l.paid, false) as paid,
           count(*) as visitors
    from firsts f
    join reached x on x.visitor_id = f.visitor_id
    left join linked l on l.visitor_id = f.visitor_id
    group by 1, 2, 3, 4, 5, 6, 7
  ),
  paths as (
    select r.path, count(distinct r.visitor_id) as visitors
    from rows r
    where r.type = 'pageview'
    group by r.path
    order by 2 desc, 1
    limit 200
  )
  select jsonb_build_object(
    'groups', coalesce((select jsonb_agg(jsonb_build_object(
        'device', g.device, 'channel', g.channel, 'pricing', g.pricing, 'signup', g.signup,
        'identified', g.identified, 'trial', g.trial, 'paid', g.paid, 'visitors', g.visitors))
      from groups g), '[]'::jsonb),
    'paths', coalesce((select jsonb_agg(jsonb_build_array(p.path, p.visitors)
        order by p.visitors desc, p.path) from paths p), '[]'::jsonb)
  );
$$;

comment on function public.funnel_summary(uuid, timestamptz, text, text, timestamptz) is
  'Visiteurs regroupés par appareil, canal et étapes atteintes (jusqu''au paiement), et pages les plus vues ; RLS appliquée.';
revoke execute on function public.funnel_summary(uuid, timestamptz, text, text, timestamptz)
  from public, anon;
grant execute on function public.funnel_summary(uuid, timestamptz, text, text, timestamptz)
  to authenticated;

-- Alertes envoyées (email, Slack) : une seule fois chacune, quel que soit le nombre de passages.
create table public.alert_deliveries (
  owner_id uuid not null references auth.users (id) on delete cascade,
  alert_id text not null check (char_length(alert_id) <= 40),
  key text not null check (char_length(key) <= 200),
  sent_at timestamptz not null default now(),
  primary key (owner_id, alert_id, key)
);

comment on table public.alert_deliveries is
  'Alertes déjà envoyées (identifiant et clé de l''événement) : jamais deux fois la même.';

alter table public.alert_deliveries enable row level security;

create policy "alert_deliveries_select_own" on public.alert_deliveries
  for select to authenticated using ((select auth.uid()) = owner_id);

-- Écriture : par la tâche horaire seulement (clé de service).
revoke insert, update, delete on public.alert_deliveries from anon, authenticated;
