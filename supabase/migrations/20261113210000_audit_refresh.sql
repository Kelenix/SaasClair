-- Analyse du site toujours à jour : date de la dernière analyse. Le tableau de bord relance
-- l'analyse quand elle a plus de 6 heures (et à la demande), la tâche horaire aussi.
-- Analyses existantes : date inconnue (null), donc relancées à la prochaine occasion.
alter table public.projects add column audited_at timestamptz;

comment on column public.projects.audited_at is
  'Dernière analyse de la page d''accueil (ou réservation d''une analyse en cours).';
