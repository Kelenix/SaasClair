-- Relier les visiteurs aux clients (lot C4) : pour chaque email identifié par le script
-- (empreinte SHA-256, jamais l'email), le canal de la toute première visite de ce visiteur.
-- Sécurité de l'appelant (security invoker) : la RLS de events ne laisse lire que ses visites.

-- Recherche rapide de la première visite d'un visiteur, et des identifications d'un projet.
create index events_project_visitor_time_idx on public.events (project_id, visitor_id, occurred_at);
create index events_project_identify_idx on public.events (project_id, email_hash)
  where type = 'identify';

create function public.customer_first_touch(p_project uuid)
returns table (email_hash text, channel text, first_seen timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with identified as (
    select distinct on (e.email_hash) e.email_hash, e.visitor_id
    from public.events e
    where e.project_id = p_project and e.type = 'identify' and e.email_hash is not null
    order by e.email_hash, e.occurred_at
  )
  select i.email_hash, f.channel, f.occurred_at
  from identified i
  cross join lateral (
    select p.channel, p.occurred_at
    from public.events p
    where p.project_id = p_project and p.visitor_id = i.visitor_id and p.type = 'pageview'
    order by p.occurred_at
    limit 1
  ) f;
$$;

comment on function public.customer_first_touch(uuid) is
  'Premier canal de chaque email identifié (empreinte) d''un projet ; lecture soumise à la RLS.';

revoke execute on function public.customer_first_touch(uuid) from public, anon;
grant execute on function public.customer_first_touch(uuid) to authenticated;
