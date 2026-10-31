# Registre de la dette technique

> Ce qui est volontairement simplifié ou reporté, et quand le reprendre. Priorité : P1 (avant ou
> juste après le lancement), P2 (dans les 3 mois), P3 (quand le besoin apparaît).

| # | Sujet | Situation actuelle | À faire | Priorité |
|---|-------|--------------------|---------|----------|
| 1 | Collecte réelle des visites | Script et réception en place, écran Acquisition réel (ADR-023) ; tunnel, inscrits par canal et insights encore à calculer ; agrégation en JavaScript jusqu’à 50 000 pages vues par période | Agrégation SQL, durée de conservation des visites, tunnel et insights sur les vraies données | P1 |
| 2 | Stripe (clients) | En production : « la connexion ouvre bientôt » ; en local : connexion et import simulés | Stripe Connect en lecture seule, synchronisation des abonnements | P1 |
| 3 | Facturation de SaasClair | Abonnements gérés à la main dans l'administration | Stripe Billing (paiement, factures, relances automatiques), webhooks → `profiles` | P1 |
| 4 | Envoi d'emails | Emails d'authentification seulement ; alertes et invitations non envoyées | Service d'envoi (SMTP / Brevo), moteur d'alertes, invitations d'équipe persistées | P1 |
| 5 | Barre de question | Réponses rédigées de démonstration | Moteur d'insights relié aux vraies données | P2 |
| 6 | Historique du revenu (administration) | Estimé à partir des abonnés actuels | Historique réel depuis Stripe Billing | P2 |
| 7 | État « lu » des notifications | Gardé dans le navigateur | Table par compte, alimentée par le moteur d'alertes | P2 |
| 8 | Liste des utilisateurs | 5 000 profils lus puis filtrés dans le navigateur | Recherche et pagination côté serveur au-delà de 5 000 comptes | P3 |
| 9 | Limite de débit | Nginx limite le site, l'API et plus strictement la connexion (`deploy/nginx/saasclair.conf`) | Limite dédiée sur l'inscription à la newsletter si des abus apparaissent | P3 |
| 16 | Sauvegardes hors serveur | Chaque nuit sur le VPS, 14 jours (ADR-021) | Copie chiffrée hors du VPS (stockage objet, ou sauvegardes Hostinger activées) | P1 |
| 17 | Mises à jour de Supabase auto-hébergé | Versions figées dans `deploy/compose.prod.yaml` | Revue trimestrielle des versions, répétition (`deploy/rehearsal.sh`) puis livraison | P2 |
| 18 | Surveillance externe | Sonde `/api/health?complet=1`, pas d'alerte automatique | Sonde externe gratuite (UptimeRobot, Better Stack) toutes les 5 minutes, alerte par email | P1 |
| 10 | CSP | `'unsafe-inline'` pour les scripts (scripts en ligne de Next.js) | Nonce par requête | P2 |
| 11 | Double authentification | Non exposée | TOTP Supabase pour les super administrateurs en priorité | P2 |
| 12 | Mises à jour majeures | TypeScript 5.9, ESLint 9, @types/node 24 | TypeScript 7, ESLint 10 (corrige les alertes des outils de développement), @types/node 26, une à la fois | P2 |
| 13 | Anglais | Interface en français uniquement (ADR-005) | Extraction des textes et traduction si le marché l'exige | P3 |
| 14 | Paddle et Lemon Squeezy | Annoncés « bientôt » | Connecteurs | P3 |
| 15 | Mesures de performance mobile | Non fiables sur le poste de développement | PageSpeed Insights sur la production | P1 (déploiement) |

Règle : toute simplification nouvelle s'ajoute ici avant d'être livrée ; une ligne se retire
quand elle est traitée, avec la version dans `CHANGELOG.md`.
