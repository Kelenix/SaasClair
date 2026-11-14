# Registre de la dette technique

> Ce qui est volontairement simplifié ou reporté, et quand le reprendre. Priorité : P1 (avant ou
> juste après le lancement), P2 (dans les 3 mois), P3 (quand le besoin apparaît).

| # | Sujet | Situation actuelle | À faire | Priorité |
|---|-------|--------------------|---------|----------|
| 1 | Collecte réelle des visites | Script, réception, Acquisition, tunnel (pages clés), revenu par canal et insights réels (lot C) ; regroupement par la base (lot B3) ; visites effacées à 25 mois (lot A) ; inscrits reliés automatiquement et même visiteur sur www et app, sans cookie (14 novembre) | Formulaires d'inscription sans balise `<form>` (une ligne `identify` reste possible) | P3 |
| 2 | Stripe (clients) | Import complet à la connexion puis chaque jour, suivi horaire incrémental, notifications en temps réel, historique des factures (expansion, contraction, cohortes), une devise additionnée (lot B) | Conversion des autres devises (taux du jour de la facture), historique au-delà de 13 mois, suppression des clients effacés pendant une coupure de plus de 30 jours | P2 |
| 19 | Connexion Stripe en vraie lecture seule | OAuth Connect en `read_write` (`read_only` réservé aux extensions, ADR-025) ; SaasClair ne fait que lire | Application Stripe (Stripe Apps) avec droits de lecture uniquement, validée par Stripe, puis `STRIPE_OAUTH_SCOPE=read_only` ou bascule vers l'application | P1 |
| 3 | Facturation de SaasClair | Stripe Checkout, notifications signées, portail client, accès selon l’abonnement (ADR-027) | Rappel par email avant la fin de l’essai, codes promo dans l’administration | P2 |
| 4 | Envoi d'emails | Authentification et alertes (lot E, SMTP Resend) | Invitations d'équipe persistées et envoyées, emails de démarrage (J0, J+1, fin d'essai) | P2 |
| 5 | Barre de question | Réponses rédigées à partir des vrais chiffres, par sujet (churn, revenu, canaux, conversion) | Questions libres plus fines (comparaisons de périodes, un client précis) | P3 |
| 6 | Historique du revenu (administration) | Estimé à partir des abonnés actuels | Historique réel depuis Stripe Billing | P2 |
| 7 | État « lu » des notifications | Alertes envoyées par email et Slack (lot E) ; état « lu » gardé dans le navigateur | Table par compte pour l'état « lu » | P3 |
| 8 | Liste des utilisateurs | 5 000 profils lus puis filtrés dans le navigateur | Recherche et pagination côté serveur au-delà de 5 000 comptes | P3 |
| 9 | Limite de débit | Nginx limite le site, l'API et plus strictement la connexion (`deploy/nginx/saasclair.conf`) | Limite dédiée sur l'inscription à la newsletter si des abus apparaissent | P3 |
| 16 | Sauvegardes hors serveur | Chaque nuit sur le VPS, 14 jours (ADR-021) | Copie chiffrée hors du VPS (stockage objet, ou sauvegardes Hostinger activées) | P1 |
| 17 | Mises à jour de Supabase auto-hébergé | Versions figées dans `deploy/compose.prod.yaml` | Revue trimestrielle des versions, répétition (`deploy/rehearsal.sh`) puis livraison | P2 |
| 18 | Surveillance externe | Sonde `/api/health?complet=1`, pas d'alerte automatique | Sonde externe gratuite (UptimeRobot, Better Stack) toutes les 5 minutes, alerte par email | P1 |
| 10 | CSP | `'unsafe-inline'` pour les scripts (nonce incompatible avec le pré-rendu partiel) ; attributs d'événement interdits, espace connecté sans domaine tiers, session `httpOnly` (lot A7) | Nonce si Next.js le permet avec le pré-rendu | P3 |
| 11 | Double authentification | Obligatoire pour le super administrateur (lot A7) | Facultative pour les clients, depuis Paramètres | P3 |
| 12 | Mises à jour majeures | TypeScript 5.9, ESLint 9, @types/node 24 | TypeScript 7, ESLint 10 (corrige les alertes des outils de développement), @types/node 26, une à la fois | P2 |
| 13 | Anglais | Interface en français uniquement (ADR-005) | Extraction des textes et traduction si le marché l'exige | P3 |
| 14 | Paddle et Lemon Squeezy | Annoncés « bientôt » | Connecteurs | P3 |
| 15 | Mesures de performance mobile | Non fiables sur le poste de développement | PageSpeed Insights sur la production | P1 (déploiement) |

Règle : toute simplification nouvelle s'ajoute ici avant d'être livrée ; une ligne se retire
quand elle est traitée, avec la version dans `CHANGELOG.md`.
