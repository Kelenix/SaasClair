-- Connexion Stripe en read_write (ADR-025) : la lecture seule (read_only) est réservée par Stripe
-- aux extensions. La FAQ ne promet donc plus une permission, mais ce que fait SaasClair : lire,
-- jamais modifier. Mise à jour seulement si la réponse d'origine n'a pas été réécrite depuis
-- l'administration.
update public.faq_items
set answer = 'Non. Nous ne faisons que lire vos clients, paiements et abonnements : SaasClair ne crée, ne modifie et ne supprime jamais rien sur votre compte Stripe.'
where answer = 'Non. L''accès est en lecture seule : nous lisons vos clients, paiements et abonnements, sans pouvoir rien changer.';
