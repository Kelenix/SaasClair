-- Textes fidèles à ce que fait SaasClair (audit de sécurité, A6) : un email n'est pas
-- « chiffré » mais réduit à une empreinte (SHA-256) ; les adresses IP ne sont pas
-- « anonymisées » mais jamais enregistrées ; les recommandations ne prennent pas 24 heures.
-- Mise à jour seulement si la réponse d'origine n'a pas été réécrite depuis l'administration.
update public.faq_items
set answer = 'Oui. Hébergement en Europe, aucune adresse IP enregistrée, et les emails ne sont jamais envoyés en clair : seule leur empreinte sert à les comparer. Les visites sont effacées au bout de 25 mois, et vous pouvez supprimer toutes vos données à tout moment.'
where answer = 'Oui. Hébergement en Europe, adresses IP anonymisées, emails chiffrés avant d''être comparés. Vous pouvez supprimer toutes vos données à tout moment.';

update public.faq_items
set answer = 'Tout de suite : l''analyse de votre site s''affiche dès l''inscription, vos revenus et votre churn dès la connexion de Stripe, et vos priorités de la semaine sont calculées à chaque visite du tableau de bord.'
where answer = 'Vos chiffres de revenu et de churn apparaissent dès la connexion de Stripe. Les premières recommandations arrivent sous 24 heures.';
