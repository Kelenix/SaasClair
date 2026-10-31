# État du projet — PROJECT_STATE

> Mis à jour par Claude à la fin de chaque phase / incrément. Toujours lire ce fichier avant d'agir.

## Snapshot

- **Phase courante** : 6 — Mise en production : **en ligne sur https://saasclair.com**, déploiement automatique à chaque envoi sur `main`
- **Dernière mise à jour** : 2026-10-31 — version `1.0.0-rc.1`
- **Santé** : 🟢 OK — lint, types, 115 tests unitaires, 52 tests de bout en bout, build ; 0 vulnérabilité en production
- **Prochaine action** : compte super administrateur (tâche 12), SMTP (tâche 11), mentions légales et vrais témoignages (tâches 8, 9, 14)

## Avancement par phase

| Phase | État | Notes |
|-------|------|-------|
| 0 — Cadrage & intake        | ✅ fait | Sources lues, plan rédigé (`docs/PLAN.md`), décisions ADR-001 à 011 |
| 1 — Définition produit      | ✅ fait | Couvert par `docs/PLAN.md` (périmètre, incréments, critères d'acceptation) |
| 2 — Planification           | ✅ fait | Backlog ci-dessous |
| 3 — Architecture & design   | ✅ fait | `docs/architecture.md`, `docs/system-design.md`, `docs/data-model.md`, `docs/design/design-system.md`, `docs/design/flows.md` |
| 4 — Implémentation          | 🔄 en cours | Inc-0 à Inc-8 et espace super administrateur faits ; reste ouverte aux ajouts de l'utilisateur et à la dette technique P1 (`docs/tech-debt.md`) |
| 5 — Qualité                 | ✅ fait | Plan de test `docs/qa/test-plan.md`, performance `docs/performance.md` |
| 6 — Mise en production      | 🔄 en cours | **En ligne** sur https://saasclair.com (ADR-021, `docs/deployment.md`) ; reste la CD GitHub et les tâches 11-12 |
| 7 — Documentation           | ✅ fait | Portail illustré avec logo + PDF (`npm run docs:build`, `docs/SaasClair-documentation.pdf`), `docs/handover.md`, `docs/configuration.md`, `docs/style-guide.md`, `CHANGELOG.md` |
| 8 — Maintenance             | ✅ fait (passe avant lancement) | Dépendances à jour, 0 vulnérabilité en production, code mort retiré, `npm run db:backup`, sonde `/api/health?complet=1`, `docs/maintenance.md`, `docs/runbook.md`, `docs/tech-debt.md`. Se poursuit après la mise en ligne (calendrier dans `docs/maintenance.md`) |

> États : ⬜ à faire · 🔄 en cours · ✅ fait · ⏸️ en attente (raison)

## Backlog incréments (incrément vertical = livrable)

| ID | Incrément | Exigence liée | Priorité | État |
|----|-----------|---------------|----------|------|
| 0 | Socle (Next.js, Docker, CI, logos) | CLAUDE.md §3 | Must | ✅ |
| 1 | Système de design + page `/design` | CLAUDE.md §2, §4, §6.1 | Must | ✅ (à valider) |
| 2 | Site vitrine | CLAUDE.md §5.1 | Must | ✅ (à valider) |
| 3 | Inscription & connexion | CLAUDE.md §5.2 | Must | ✅ (à valider) |
| 4 | Configuration en 2 actions | CLAUDE.md §5.3, .docx F1–F3 | Must | ✅ (à valider) |
| 5 | Structure tableau de bord + Accueil | CLAUDE.md §5.4, .docx F4 | Must | ✅ (à valider) |
| 6 | Churn, Acquisition, Tunnel, Revenus | CLAUDE.md §5.4 | Must | ✅ (à valider) |
| 7 | Insights, alertes, paramètres | CLAUDE.md §5.4, .docx F5–F6 | Must | ✅ (à valider) |
| 8 | Qualité & optimisation | CLAUDE.md §7 | Must | ✅ (à valider) |
| 8b | Espace super administrateur | Demande utilisateur (ADR-020) | Must | ✅ (à valider) |
| 9 | Mise en production VPS | Skill (DevOps) | Must | 🔄 |
| 10 | Documentation & passation | Skill | Must | ✅ (à valider) |

## Décisions ouvertes / questions à l'utilisateur

- [x] Q1 — Périmètre : produit complet sur données de démo + vraie auth + vrai audit d'URL
- [x] Q2 — Tarifs : 29 € / 79 € / sur devis, −20 % en annuel

## Blocages

- (aucun)

## Tâches manuelles utilisateur en attente

- voir `docs/manual-tasks.md`

## Journal de session (résumé court, le plus récent en haut)

- 2026-10-31 — Connexion Stripe réelle (ADR-024) : OAuth Connect lecture seule, import clients, abonnements et factures en arrière-plan, avancement réel à l’écran, Stripe simulé pour les tests (`/api/stripe-mock`, jamais en production). Installation du script simplifiée (une seule fois, plateforme détectée, WPCode, envoi au développeur). 136 tests unitaires, 56 de bout en bout. Attend la tâche n° 7 (Stripe Connect) de l’utilisateur. Suite : écrans Revenus et Churn réels.
- 2026-10-31 — Collecte réelle, étape 1 (ADR-023) : script `public/s.js` (2,7 Ko), réception `/api/collect`, table `events` (RLS), détection réelle du script, écran Acquisition sur les vraies visites, appels internes exemptés de la limite Nginx. Test de bout en bout avec un faux site client. 129 tests unitaires, 54 de bout en bout. Étape 2 : Stripe Connect (nécessite le compte Stripe de l’utilisateur).
- 2026-10-31 — ADR-022 : plus aucune donnée d’exemple en production (`DEMO_DATA=true` seulement en local et en CI). Écrans vides sur tout le tableau de bord, notifications, barre de question, couverture, détection du script et import Stripe sans simulation. Vérifié écran par écran en mode production ; 119 tests unitaires, 53 de bout en bout. Prochaine priorité : la collecte réelle (script et Stripe Connect).
- 2026-10-31 — Retour utilisateur sur la configuration : lien de démonstration retiré, « Passer cette étape » sur les 3 étapes et « Terminer plus tard » dans l’en-tête, bandeau des étapes restantes sur le tableau de bord (liens directs `?etape=`), connexion suivante vers le tableau de bord. Migration `setup_later` (adresse facultative, `setup_skipped_at`, fin de l’ordre imposé script → Stripe). Corrigé en vérifiant : enregistrement Stripe refusé par l’ancienne règle d’ordre, parcours figé par la mémoire des pages de Next.js (liens du bandeau en chargement complet). 119 tests unitaires, 53 de bout en bout.
- 2026-10-31 — Déploiement automatique activé (environnement GitHub `production` créé par l’utilisateur). Contrôles CI réparés : la construction exigeait une base Supabase (contenus publics lus au pré-rendu).
- 2026-10-31 — **Mise en ligne** sur le VPS Hostinger : inspection en lecture seule (Nginx déjà en place, 7 sites, ports 3110-3130 libres, 1,2 Go de mémoire disponible), amorçage (Supabase réduit, 4 migrations, Nginx, HTTPS Let’s Encrypt pour saasclair.com, www et api, sauvegarde de nuit, utilisateur `deploy`), 1re version construite sur le poste et envoyée par SSH. Vérifié : santé complète, redirections, pages protégées, en-têtes, console sans erreur, autres sites du serveur intacts. SaasClair occupe ≈ 200 Mo.
- 2026-10-31 — Inc-9 préparé : Supabase auto-hébergé réduit (base, Auth, API), ports 3110-3130 sur 127.0.0.1, Nginx à part (`api.saasclair.com`), bascule blue/green sans coupure, secrets nés sur le serveur, migrations et sauvegardes sur le VPS, pipeline `deploy.yml` (désactivé tant que `DEPLOY_ENABLED` n’est pas posé) — ADR-021. Répétition locale complète (`deploy/rehearsal.sh`) : 49/52 tests de bout en bout, les 3 autres vérifiés à la main (environnement Windows ou charge). Corrigé grâce à la répétition : en-têtes Nginx trop petits pour les cookies de session (502 à la connexion), rôle absent du jeton, CORS `apikey`, hôte sans port, connexions réutilisées fermées par Node.
- 2026-10-31 — Phases 3, 7 et 8 terminées. Architecture : `architecture.md`, `system-design.md`, `data-model.md`, `design/flows.md`. Maintenance : mises à jour mineures, 0 vulnérabilité en production, 13 exports morts retirés, sauvegarde (`npm run db:backup`), sonde complète, `maintenance.md`, `runbook.md`, `tech-debt.md`, version `1.0.0-rc.1`. Documentation : portail HTML avec logo et 15 captures réelles, PDF de 28 pages, kit de remise, configuration des clés, charte éditoriale, `CHANGELOG.md`.
- 2026-10-30 — Compte super administrateur de l'utilisateur créé en local par `npm run admin:create` (identifiants hors du projet, connexion vérifiée). La même commande servira en production (tâche n° 12).
- 2026-10-30 — Espace super administrateur (ADR-020). Migration `super_admin` : profils et rôles, provenance, abonnements, FAQ, témoignages, À propos, newsletter, réglages, journal ; RLS vérifiée. `/admin` en 9 écrans : tableau de bord, utilisateurs (fiche et actions), abonnements, newsletter (export CSV), témoignages, FAQ, À propos, paramètres (pixels Google Ads, GA4, Meta, LinkedIn), état du système. Site vitrine branché sur ces contenus, page `/a-propos`, newsletter dans le pied de page, bandeau de consentement, conversion « inscription ». Seed : compte `admin@demo.saasclair.fr` et 60 clients de démonstration.
- 2026-10-30 — Site vitrine, retours utilisateur : maquette du hero interactive (menu cliquable, 6 écrans animés : Accueil, Acquisition, Tunnel, Churn, Revenus, Insights ; onglets sur mobile ; chiffres alignés sur le vrai tableau de bord), FAQ avec 4 garanties et appel à l'action dans la colonne de gauche (collante sur ordinateur), espaces entre sections réduits (80–112 px → 48–64 px de part et d'autre).
- 2026-10-30 — Badge des alertes fonctionnel : clic sur une alerte = lue (le compteur baisse, animé), « Tout marquer comme lu », badge masqué à zéro, état gardé dans le navigateur (`sc_notifications_lues`). À brancher sur le futur moteur d'alertes pour un suivi par compte.
- 2026-10-30 — Retours utilisateur sur la barre latérale : bouton « replier » devenu une icône en haut (à côté du logo, sous le logo quand la barre est repliée, avec infobulle), Paramètres intégré à la liste du menu, même icône de question sur mobile et dans le champ ordinateur, pastille « N » de développement Next.js masquée (`devIndicators: false`).
- 2026-10-30 — Inc-8 : Playwright + axe-core (35 tests : parcours complet, accessibilité WCAG AA sur 11 pages à l'ordinateur et à 360 px, sécurité, clavier, animations réduites), job CI `e2e` — ADR-019. Corrigé : mot de passe dans l'adresse si l'envoi précédait React (formulaires en POST), retour sur « C'est terminé » à chaque connexion, boutons muets pendant le chargement, contrastes (crème sur forêt, pulsation des badges or), zones défilantes inaccessibles au clavier, titres affichés seulement après le JavaScript. Lighthouse ordinateur : 93 (LCP 1,5 s, CLS 0). Mesures mobiles non fiables sur ce poste : à refaire en production.
- 2026-10-30 — Inc-7 : écran Insights et alertes (historique filtrable, impact mesuré, alertes actives par défaut, email et Slack), Paramètres en 5 onglets (projet, équipe, abonnement, confidentialité, intégrations) — ADR-018. Migration `alert_settings` + anonymisation + suppression du projet (RLS vérifiée avec un autre compte). Projet de démo de Nadia ajouté au seed. Vérifié à 360 px et ~800 px ; suppression réelle testée puis projet recréé. Corrigé : constante importée depuis un module client, `Date.now()` au pré-rendu.
- 2026-10-30 — Inc-6 : écrans Churn et rétention (indicateurs, 9 clients suivis, panneau client et brouillon de relance, cohortes, raisons de départ), Acquisition (tableau par canal, répartition, évolution, campagnes et pages d'entrée), Tunnel (tunnel animé, étape en or, comparaison appareil / pays / canal), Revenus (courbe, mouvements, paiements échoués) — ADR-017. Vérifié à 360 px, ~800 px et 1366 px, console sans erreur. Corrigé : mois en double sur 12 mois, `new Date()` au pré-rendu, particules non identiques serveur / navigateur.
- 2026-10-30 — Inc-5 : structure du tableau de bord et accueil (ADR-016). Barre latérale repliable / icônes / barre du bas, période globale, barre de question, alertes, profil, 4 indicateurs, 3 insights (Fait / Ignorer en base), graphique des revenus, canaux, tunnel, clients à risque, bandeau de confirmation, états chargement / vide / erreur. Vérifié à 360, 768 et ~1050 px. Corrigé : incohérence croissance / graphique, débordements (barre du bas, tableau pour lecteurs d'écran), grilles trop serrées.
- 2026-10-30 — Inc-4 : configuration en 2 actions (ADR-015). Migration `projects` + RLS (testée avec un second compte), audit réel d'URL anti-SSRF (testé sur plausible.io : 47 pages, inscription et tarifs trouvés, 83/100), étape script (5 plateformes, copie, envoi au développeur, détection simulée), étape Stripe (import et liaison simulés), écran final à particules, reprise après rechargement, `/app` provisoire. Vérifié de bout en bout sur ordinateur et à 360 px.
- 2026-10-30 — Inc-3 : inscription, connexion, mot de passe oublié et nouveau mot de passe (Supabase Auth, ADR-014), écran deux parties avec panneau animé, validation en temps réel, Google/GitHub prêts (à activer), emails en français, en-têtes de sécurité (`docs/security.md`), compte de démo local. Testé de bout en bout dans le navigateur, y compris sur le build de production (CSP sans violation). Corrigé : `Date.now()` pendant le pré-rendu (ajout de `connection()`), fichiers non synchronisés par `docker compose watch`.
- 2026-10-29 — Hero refait à la demande de l'utilisateur (ADR-013) : centré, grande maquette animée du tableau de bord, téléphone flottant, bandeau de chiffres. Vérifié à 360, 780, 1000 et 1440 px. Note : `npm run up` occupe le port 3000 ; un `npm run dev` lancé en plus démarre sur 3002.
- 2026-10-29 — Inc-2 : site vitrine (`src/features/marketing/`) — navigation + menu mobile, hero avec champ d'adresse et aperçu animé, 3 promesses, « 2 clics » au défilement, section churn de Nadia, témoignages (provisoires), tarifs mensuel/annuel, FAQ, appel final, pied de page, page 404 de marque, SEO (ADR-012). Corrigés en cours de route : animations qui ne partaient pas (éléments à l'échelle 0 invisibles pour le navigateur), espace des milliers absente de Fraunces, débordements à 360 px. Vérifié à 780 px et 360 px.
- 2026-10-29 — Inc-0 : Next.js 16.4 + Tailwind 4 + shadcn/ui, Docker (`npm run up` vérifié, rechargement à chaud OK), Supabase local sur ports 5532x (ADR-011), CI GitHub Actions, logos détourés + favicon (ADR-007). Inc-1 : jetons, composants, icônes animées (ADR-009), contrastes AA testés (ADR-010), page `/design` vérifiée à 800 px et 360 px. Image prod OK (`/api/health` 200 sur 3001). Pas encore de dépôt Git.
- 2026-10-29 — Cadrage : lecture des sources (INTAKE = texte de mission), DECISION_LOG initialisé, plan de réalisation et hypothèses (`docs/PLAN.md`).
