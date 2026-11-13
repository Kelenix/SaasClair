-- Pages clés confirmées en un clic par l'utilisateur quand l'analyse du site ne les a pas
-- trouvées (comme checkout_url) : elles dessinent le tunnel de conversion sans configuration.
alter table public.projects
  add column signup_url text check (signup_url ~ '^https?://'),
  add column pricing_url text check (pricing_url ~ '^https?://');

comment on column public.projects.signup_url is 'Page d''inscription confirmée (sinon : analyse du site).';
comment on column public.projects.pricing_url is 'Page de tarifs confirmée (sinon : analyse du site).';
