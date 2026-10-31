-- Suivi « Fait / Ignoré » des recommandations, pour mesurer leur impact après action (CLAUDE.md §5.4).

create type public.insight_status as enum ('done', 'ignored');

create table public.insight_feedback (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  insight_id text not null check (char_length(insight_id) between 1 and 80),
  status public.insight_status not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, insight_id)
);

comment on table public.insight_feedback is 'Recommandations marquées faites ou ignorées par chaque compte.';

alter table public.insight_feedback enable row level security;

create policy "insight_feedback_select_own" on public.insight_feedback
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy "insight_feedback_insert_own" on public.insight_feedback
  for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy "insight_feedback_update_own" on public.insight_feedback
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "insight_feedback_delete_own" on public.insight_feedback
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- Page de paiement confirmée en un clic quand l'analyse ne l'a pas trouvée (mode secours, .docx §3.3).
alter table public.projects
  add column checkout_url text check (checkout_url ~ '^https?://');
