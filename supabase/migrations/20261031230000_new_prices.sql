-- Nouvelle grille (ADR-028) : essai gratuit de 7 jours, trois offres à prix fixe (Starter 9,99 €,
-- Growth 19,99 €, Pro 29,90 € HT par mois), plus d'offre Pro « sur devis ».
-- Les essais déjà commencés gardent leur date de fin : seule la valeur par défaut change.
alter table public.profiles
  alter column trial_ends_at set default now() + interval '7 days';

-- Le prix négocié de l'offre Pro n'existe plus : chaque offre est facturée au prix catalogue.
update public.profiles set custom_monthly_price = null where custom_monthly_price is not null;
comment on column public.profiles.custom_monthly_price is
  'Inutilisé depuis ADR-028 (offre Pro à prix fixe). Conservé vide.';
