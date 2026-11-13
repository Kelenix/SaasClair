-- Newsletter (audit de sécurité, A8) : l'inscription passe uniquement par le formulaire du site
-- (piège à robots, limite de débit), écrit par le serveur avec la clé de service. L'écriture
-- directe par l'API publique, qui contournait ces protections, est fermée.
drop policy if exists "newsletter_subscribe" on public.newsletter_subscribers;
revoke insert on public.newsletter_subscribers from anon, authenticated;
