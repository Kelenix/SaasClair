-- Données locales de développement (rejouées par `npm run db:reset`). Jamais appliquées en production.
-- Compte de démonstration : nadia@demo.saasclair.fr / Demo-SaasClair-2026

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'nadia@demo.saasclair.fr',
  crypt('Demo-SaasClair-2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Nadia"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  'a1b2c3d4-0000-4000-8000-000000000001',
  'a1b2c3d4-0000-4000-8000-000000000001',
  '{"sub":"a1b2c3d4-0000-4000-8000-000000000001","email":"nadia@demo.saasclair.fr","email_verified":true}',
  'email', now(), now(), now()
);

-- Projet de démonstration de Nadia : configuration terminée, page de paiement à confirmer
-- (le bandeau en un clic de l'accueil s'affiche).
insert into public.projects (owner_id, site_url, script_detected_at, stripe_connected_at)
values (
  'a1b2c3d4-0000-4000-8000-000000000001',
  'https://demo.saasclair.fr',
  now() - interval '3 days',
  now() - interval '3 days'
);
