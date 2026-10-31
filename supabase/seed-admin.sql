-- Données de démonstration de l'espace super administrateur (base locale uniquement).

-- Compte super administrateur de démonstration. En production, promouvoir un vrai compte :
-- update public.profiles set role = 'super_admin' where email = '…';
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1b2c3d4-0000-4000-8000-0000000000ad',
  'authenticated', 'authenticated',
  'admin@demo.saasclair.fr',
  crypt('Admin-SaasClair-2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Équipe SaasClair"}',
  now() - interval '200 days', now(), '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  'a1b2c3d4-0000-4000-8000-0000000000ad',
  'a1b2c3d4-0000-4000-8000-0000000000ad',
  '{"sub":"a1b2c3d4-0000-4000-8000-0000000000ad","email":"admin@demo.saasclair.fr","email_verified":true}',
  'email', now(), now(), now()
);

update public.profiles
   set role = 'super_admin', plan = 'pro', subscription_status = 'active', custom_monthly_price = 0,
       created_at = now() - interval '200 days'
 where id = 'a1b2c3d4-0000-4000-8000-0000000000ad';

-- Nadia, cliente de l'offre Growth, arrivée par LinkedIn.
update public.profiles
   set plan = 'growth', billing_interval = 'monthly', payment_method = 'card',
       subscription_status = 'active', signup_channel = 'linkedin', signup_source = 'linkedin',
       signup_medium = 'social', signup_campaign = 'cas-client-cobalt',
       current_period_end = now() + interval '18 days', created_at = now() - interval '120 days'
 where id = 'a1b2c3d4-0000-4000-8000-000000000001';

-- 60 clients de démonstration (entreprises inventées, domaines réservés .example).
do $$
declare
  first_names text[] := array['Léa','Hugo','Inès','Paul','Sarah','Malik','Chloé','Yanis','Emma',
    'Lucas','Jade','Nathan','Lina','Théo','Manon','Rayan','Zoé','Adam','Camille','Noé'];
  companies text[] := array['lumen-bureau','atelier-cobalt','verso-rh','orbe-formation',
    'maison-pivot','studio-nereide','cap-horizon','pixel-pepin','ferme-numerique','kalia-sante',
    'bureau-sillage','nova-ateliers','tisserand-fils','agence-rivage','planeo-equipe',
    'clef-de-voute','granit-conseil','lueur-digitale','arbre-a-devis','quai-numero-9'];
  channels text[] := array['seo','seo','seo','linkedin','linkedin','direct','direct','partners',
    'instagram','ads','ads','email','referral'];
  sources text[] := array['google','google','google','linkedin','linkedin',null,null,'partenaires',
    'instagram','google','google','newsletter','blog-saas.example'];
  mediums text[] := array['organic','organic','organic','social','social',null,null,'referral',
    'social','cpc','cpc','email','referral'];
  campaigns text[] := array[null,null,null,'cas-client-cobalt','webinar-planning',null,null,
    'programme-comptables','reels-automne','logiciel-planning','churn-saas','newsletter-octobre',null];
  plans public.plan_id[] := array['starter','growth','growth','starter','growth','pro','trial',
    'trial','starter','growth'];
  methods public.payment_method[] := array['card','card','card','card','sepa','sepa','paypal',
    'bank_transfer'];
  i int;
  pick int;
  new_id uuid;
  joined timestamptz;
  chosen_plan public.plan_id;
  chosen_status public.subscription_status;
begin
  for i in 1..60 loop
    new_id := gen_random_uuid();
    pick := 1 + (i * 7) % array_length(channels, 1);
    joined := now() - ((i * 37) % 175) * interval '1 day' - (i % 9) * interval '1 hour';
    chosen_plan := plans[1 + (i * 3) % array_length(plans, 1)];
    chosen_status := case
      when joined > now() - interval '14 days' then 'trialing'
      when chosen_plan = 'trial' then 'canceled'
      when i % 17 = 0 then 'past_due'
      when i % 23 = 0 then 'canceled'
      else 'active'
    end;
    if chosen_status = 'trialing' then chosen_plan := 'trial'; end if;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, last_sign_in_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      lower(first_names[1 + i % 20]) || '.' || i || '@' || companies[1 + (i * 3) % 20] || '.example',
      crypt(gen_random_uuid()::text, gen_salt('bf')), joined,
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'first_name', first_names[1 + i % 20],
        'signup_channel', channels[pick],
        'signup_source', sources[pick],
        'signup_medium', mediums[pick],
        'signup_campaign', campaigns[pick],
        'signup_referrer', case when channels[pick] = 'referral' then 'https://blog-saas.example/outils' end,
        'signup_landing', case when i % 3 = 0 then '/tarifs' else '/' end
      ),
      joined, now(), now() - ((i * 13) % 20) * interval '1 day',
      '', '', '', ''
    );

    update public.profiles
       set plan = chosen_plan,
           subscription_status = chosen_status,
           billing_interval = case when chosen_plan = 'trial' then null
                                   when i % 4 = 0 then 'annual'::public.billing_interval
                                   else 'monthly'::public.billing_interval end,
           payment_method = case when chosen_plan = 'trial' then null
                                 else methods[1 + i % array_length(methods, 1)] end,
           custom_monthly_price = case when chosen_plan = 'pro' then 190 + (i % 4) * 60 end,
           trial_ends_at = joined + interval '14 days',
           current_period_end = case when chosen_status in ('active', 'past_due')
                                     then now() + ((i * 11) % 30) * interval '1 day' end,
           -- Quelques clients sont « connectés » (vus il y a moins de 5 minutes).
           last_seen_at = case when i % 9 = 0 then now() - (i % 4) * interval '1 minute'
                               else now() - ((i * 7) % 240) * interval '1 hour' end
     where id = new_id;
  end loop;
end $$;

-- Abonnés à la newsletter de démonstration.
insert into public.newsletter_subscribers (email, source, created_at)
select 'lecteur' || n || '@' || (array['planeo.example','rivage.example','granit.example','lueur.example'])[1 + n % 4],
       (array['pied-de-page','pied-de-page','a-propos'])[1 + n % 3],
       now() - (n * 5) * interval '1 day'
  from generate_series(1, 28) as n;

-- Témoignages d'exemple (à remplacer par de vrais témoignages depuis l'espace administrateur).
insert into public.testimonials (quote, author, role, position) values
  ('J''ai découvert que LinkedIn m''amenait 40 % de mon revenu. J''ai arrêté les publicités Instagram le lendemain.',
   'Camille R.', 'Fondatrice, outil de planning RH', 1),
  ('Installé un mardi midi entre deux réunions. Le soir, je savais quels clients appeler.',
   'Thomas L.', 'Cofondateur, logiciel de devis', 2),
  ('Notre churn est passé de 6 % à 4 % en trois mois. On relance enfin au bon moment.',
   'Sofia M.', 'Responsable croissance, SaaS comptable', 3);
