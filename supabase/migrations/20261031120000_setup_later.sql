-- Configuration « plus tard » : chaque étape peut être passée, le tableau de bord rappelle ce
-- qui reste. Un projet peut donc exister avant que l'adresse du site soit connue (sa clé sert
-- déjà à la ligne de script), et l'on retient que l'utilisateur a choisi de finir plus tard
-- (connexion suivante : directement le tableau de bord).

alter table public.projects alter column site_url drop not null;

alter table public.projects add column setup_skipped_at timestamptz;

comment on column public.projects.setup_skipped_at is
  'Dernière fois que l''utilisateur a passé une étape de la configuration.';

-- Les étapes se font désormais dans n'importe quel ordre (on peut passer le script et connecter
-- Stripe) : la règle « pas de Stripe sans script » disparaît.
alter table public.projects drop constraint projects_steps_in_order;
