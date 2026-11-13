-- Acquisition et tunnel regroupés par la base (lot B3) : l'application ne lit plus chaque visite
-- de la période (50 000 lignes au plus jusqu'ici), seulement des totaux. Même règle que les
-- versions de référence testées (src/features/collect/aggregate.ts et funnel.ts).
-- Sécurité de l'appelant (security invoker) : la RLS de events ne laisse lire que ses visites.
-- Index utilisés : events_project_time_idx (projet, date) pour la période ; aucun index de plus,
-- pour garder la réception des visites rapide.

create function public.acquisition_summary(
  p_project uuid,
  p_since timestamptz,
  p_until timestamptz,
  p_buckets integer
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with views as (
    select e.id, e.visitor_id, e.occurred_at, e.path, e.channel, e.utm_campaign,
           e.referrer_host, e.device
    from public.events e
    where e.project_id = p_project
      and e.type = 'pageview'
      and e.occurred_at >= p_since
      and e.occurred_at <= p_until
  ),
  -- Première visite de chaque visiteur sur la période : son canal, sa page d'entrée, son appareil.
  firsts as (
    select distinct on (v.visitor_id) v.path, v.channel, v.utm_campaign, v.referrer_host, v.device
    from views v
    order by v.visitor_id, v.occurred_at, v.id
  ),
  trend as (
    select least(p_buckets - 1, greatest(0, floor(
             extract(epoch from (v.occurred_at - p_since))
             / nullif(extract(epoch from (p_until - p_since)), 0) * p_buckets
           )::integer)) as bucket,
           count(distinct v.visitor_id) as visitors
    from views v
    group by 1
  )
  select jsonb_build_object(
    'visitors', (select count(*) from firsts),
    'pageviews', (select count(*) from views),
    'mobile', (select count(*) from firsts f where f.device = 'mobile'),
    'trend', coalesce((select jsonb_agg(jsonb_build_array(t.bucket, t.visitors)) from trend t),
                      '[]'::jsonb),
    'channels', coalesce((select jsonb_agg(jsonb_build_array(x.k, x.n) order by x.n desc, x.k)
      from (select f.channel as k, count(*) as n from firsts f
            group by 1 order by 2 desc, 1 limit 8) x), '[]'::jsonb),
    'landing', coalesce((select jsonb_agg(jsonb_build_array(x.k, x.n) order by x.n desc, x.k)
      from (select f.path as k, count(*) as n from firsts f
            group by 1 order by 2 desc, 1 limit 8) x), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_array(x.k, x.n) order by x.n desc, x.k)
      from (select f.utm_campaign as k, count(*) as n from firsts f
            where f.utm_campaign is not null
            group by 1 order by 2 desc, 1 limit 8) x), '[]'::jsonb),
    'referrers', coalesce((select jsonb_agg(jsonb_build_array(x.k, x.n) order by x.n desc, x.k)
      from (select f.referrer_host as k, count(*) as n from firsts f
            where f.referrer_host is not null
            group by 1 order by 2 desc, 1 limit 8) x), '[]'::jsonb)
  );
$$;

comment on function public.acquisition_summary(uuid, timestamptz, timestamptz, integer) is
  'Visiteurs, pages vues, tranches et classements (canal, page d''entrée, campagne, site) d''une période ; RLS appliquée.';

create function public.funnel_summary(
  p_project uuid,
  p_since timestamptz,
  p_pricing text,
  p_signup text
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with rows as (
    select e.id, e.visitor_id, e.occurred_at, e.type, e.path, e.device, e.channel
    from public.events e
    where e.project_id = p_project and e.occurred_at >= p_since
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
  groups as (
    select f.device, f.channel, x.pricing, x.signup, x.identified, count(*) as visitors
    from firsts f
    join reached x on x.visitor_id = f.visitor_id
    group by 1, 2, 3, 4, 5
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
        'identified', g.identified, 'visitors', g.visitors)) from groups g), '[]'::jsonb),
    'paths', coalesce((select jsonb_agg(jsonb_build_array(p.path, p.visitors)
        order by p.visitors desc, p.path) from paths p), '[]'::jsonb)
  );
$$;

comment on function public.funnel_summary(uuid, timestamptz, text, text) is
  'Visiteurs regroupés par appareil, canal et étapes atteintes, et pages les plus vues ; RLS appliquée.';

revoke execute on function public.acquisition_summary(uuid, timestamptz, timestamptz, integer)
  from public, anon;
revoke execute on function public.funnel_summary(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.acquisition_summary(uuid, timestamptz, timestamptz, integer)
  to authenticated;
grant execute on function public.funnel_summary(uuid, timestamptz, text, text) to authenticated;
