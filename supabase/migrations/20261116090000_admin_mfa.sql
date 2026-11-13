-- Double authentification du super administrateur (audit, lot A7) : ses droits d'administration
-- ne valent que dans une session confirmée par un code à 6 chiffres (application
-- d'authentification, niveau « aal2 » du jeton). Mot de passe volé ou session simple : aucun
-- accès aux données des autres comptes, même par l'API. Son propre tableau de bord reste
-- accessible comme pour tout compte.

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
     and exists (
       select 1 from public.profiles
        where id = (select auth.uid()) and role = 'super_admin'
     );
$$;

comment on function public.is_super_admin() is
  'Super administrateur dans une session confirmée par la double authentification (aal2).';
