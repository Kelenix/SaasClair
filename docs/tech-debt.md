# Registre de la dette technique

> Ce qui est volontairement simplifié ou reporté, et quand le reprendre. Priorité : P1 (avant ou
> juste après le lancement), P2 (dans les 3 mois), P3 (quand le besoin apparaît).

| # | Sujet | Situation actuelle | À faire | Priorité |
|---|-------|--------------------|---------|----------|
| 1 | Collecte réelle des visites | Script, réception, Acquisition, tunnel (pages clés), revenu par canal et insights réels (lot C) ; regroupement par la base (lot B3) ; visites effacées à 25 mois (lot A) | Identification automatique à l’inscription (décision RGPD), identifiant partagé entre sous-domaines | P1 |
| 2 | Stripe (clients) | Import complet à la connexion puis chaque jour, suivi horaire incrémental, notifications en temps réel, historique des factures (expansion, contraction, cohortes), une devise additionnée (lot B) | Conversion des autres devises (taux du jour de la facture), historique au-delà de 13 mois, suppression des clients effacés pendant une coupure de plus de 30 jours | P2 |
| 19 | Connexion Stripe en vraie lecture seule | OAuth Connect en `read_write` (`read_only` réservé aux extensions, ADR-025) ; SaasClair ne fait que lire | Application Stripe (Stripe Apps) avec droits de lecture uniquement, validée par Stripe, puis `STRIPE_OAUTH_SCOPE=read_only` ou bascule vers l'application | P1 |
| 3 | Facturation de SaasClair | Stripe Checkout, notifications signées, portail client, accès selon l’abonnement (ADR-027) | Rappel par email avant la fin de l’essai, codes promo dans l’administration | P2 |
| 4 | Envoi d'emails | Emails d'authentification seulement ; alertes et invitations non envoyées | Service d'envoi (SMTP / Brevo), moteur d'alertes, invitations d'équipe persistées | P1 |
| 5 | Barre de question | Réponses rédigées à partir des vrais chiffres, par sujet (churn, revenu, canaux, conversion) | Questions libres plus fines (comparaisons de périodes, un client précis) | P3 |
| 6 | Historique du revenu (administration) | Estimé à partir des abonnés actuels | Historique réel depuis Stripe Billing | P2 |
| 7 | État « lu » des notifications | Alertes tirées des insights réels ; état « lu » gardé dans le navigateur, emails non envoyés | Table par compte et envoi par email (Resend) | P2 |
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
