-- Inscrits par canal (décision du 14 novembre 2026) : le script relie désormais seul chaque
-- inscription à son visiteur (empreinte de l'email saisi dans le formulaire d'inscription).
-- L'écran Acquisition compte les nouveaux inscrits de la période, par canal d'arrivée.
-- Même fonction qu'avant (security invoker, RLS appliquée), avec deux champs de plus.

create or replace function public.acquisition_summary(
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
  -- Inscrits de la période : la première identification de chaque email (empreinte), classée
  -- par le canal de la toute première visite de ce visiteur.
  signups as (
    select distinct on (e.email_hash) e.email_hash, e.visitor_id, e.occurred_at
    from public.events e
    where e.project_id = p_project and e.type = 'identify' and e.email_hash is not null
    order by e.email_hash, e.occurred_at
  ),
  new_signups as (
    select f.channel
    from signups s
    cross join lateral (
      select p.channel
      from public.events p
      where p.project_id = p_project and p.visitor_id = s.visitor_id and p.type = 'pageview'
      order by p.occurred_at
      limit 1
    ) f
    where s.occurred_at >= p_since and s.occurred_at <= p_until
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
    'signups', coalesce((select jsonb_agg(jsonb_build_array(x.k, x.n) order by x.n desc, x.k)
      from (select s.channel as k, count(*) as n from new_signups s
            group by 1 order by 2 desc, 1 limit 8) x), '[]'::jsonb),
    'signupsTotal', (select count(*) from new_signups),
    'referrers', coalesce((select jsonb_agg(jsonb_build_array(x.k, x.n) order by x.n desc, x.k)
      from (select f.referrer_host as k, count(*) as n from firsts f
            where f.referrer_host is not null
            group by 1 order by 2 desc, 1 limit 8) x), '[]'::jsonb)
  );
$$;
