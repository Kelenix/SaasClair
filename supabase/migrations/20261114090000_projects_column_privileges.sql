-- Audit de sécurité (A3) : un compte ne peut écrire, dans son projet, que les colonnes qu'il
-- remplit lui-même. Le reste (site relié, Stripe connecté et importé, identifiant, clé du site)
-- n'est écrit que par le serveur (clé de service), après une vraie vérification.
-- La RLS (son propre projet seulement) reste en place en plus de ces droits.
revoke insert, update on public.projects from anon, authenticated;

grant insert (
  owner_id, site_url, audit, audited_at, setup_skipped_at, billing_provider,
  checkout_url, signup_url, pricing_url, anonymize_visitors
) on public.projects to authenticated;

grant update (
  owner_id, site_url, audit, audited_at, setup_skipped_at, billing_provider,
  checkout_url, signup_url, pricing_url, anonymize_visitors
) on public.projects to authenticated;
