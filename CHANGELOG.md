# Journal des versions

Format inspiré de « Keep a Changelog ». Versions sémantiques : `majeure.mineure.correctif`.

## [Non publié]

### Ajouté
- **Connexion Stripe réelle, en lecture seule** : le client accepte sur la page de Stripe, puis ses
  clients, abonnements et factures (12 mois) sont importés ; l'étape affiche les vrais nombres
  pendant l'import. Activée dès que les clés Stripe de la plateforme sont renseignées.
- **Collecte réelle des visites** : la ligne à installer charge `https://saasclair.com/s.js` ;
  chaque page vue est reçue, classée par canal et affichée sur l'écran Acquisition (visiteurs,
  canaux, sites d'origine, pages d'entrée, campagnes). La configuration détecte d'elle-même la
  première vraie visite.
- **Configuration « plus tard »** : chaque étape (adresse du SaaS, script, Stripe) a un bouton
  « Passer cette étape », et l'en-tête propose « Terminer plus tard ». À la connexion suivante,
  l'utilisateur arrive sur son tableau de bord, qui affiche un bandeau des étapes restantes, chacune
  à un clic.
- **Mise en production** sur le VPS (Supabase auto-hébergé, Nginx, HTTPS, déploiement
  automatique sans coupure, sauvegardes de nuit) : `docs/deployment.md`.

### Modifié
- **Connexion Stripe en lecture et écriture** (la lecture seule est réservée par Stripe aux extensions) : SaasClair ne fait que lire, et les textes le disent ainsi partout.
- **Installation du script plus simple** : « une seule fois, dans l’en-tête commun », onglet de la plateforme détectée ouvert d’office (nouvel onglet Next.js), envoi au développeur mis en avant, instructions WordPress avec l’extension gratuite WPCode (l’extension « SaasClair » annoncée n’existait pas). En-tête de la configuration lisible à 360 px, chaque étape s’ouvre en haut de page.
- **Plus aucune donnée inventée en production** : tableau de bord vide (avec l'étape à faire) tant
  que l'utilisateur n'a pas de données ; plus de notifications, de réponses ni de chiffres
  d'exemple ; plus de détection de script ni d'import Stripe simulés. Les données d'exemple
  restent disponibles en local (`DEMO_DATA=true`).
- Le lien « Explorer avec des données de démonstration » est retiré de la configuration.
- Les étapes se font dans n'importe quel ordre (la base n'impose plus le script avant Stripe).
- La création du compte super administrateur fonctionne aussi en production, sans dépendance.

## [1.0.0-rc.1] — 2026-10-31 — Candidate à la mise en ligne

### Ajouté
- **Espace super administrateur** `/admin` :
  - tableau de bord (inscrits, connectés, payants, revenu, provenance, évolution) ;
  - utilisateurs et abonnements, avec actions et journal ;
  - newsletter, avec export CSV ;
  - témoignages, FAQ et page À propos modifiables ;
  - paramètres : pixels Google Ads, GA4, Meta et LinkedIn, et email de contact ;
  - état du système.
- **Provenance des inscrits** (UTM, site d'origine, 8 canaux), « dernière activité » et comptes suspendus.
- **Site vitrine** : page À propos, inscription à la newsletter, bandeau de consentement, conversion « inscription ».
- **Maquette interactive** du tableau de bord dans le hero, et badge d'alertes fonctionnel.
- **Maintenance** :
  - `npm run admin:create` et `npm run db:backup` ;
  - sonde `/api/health?complet=1` ;
  - documentation d'architecture, de maintenance et portail de documentation.

### Modifié
- **Barre latérale** : bouton « replier » en icône, Paramètres intégré au menu.
- **Espacements** du site vitrine resserrés ; FAQ complétée de garanties.
- **Dépendances** : React 19.3.1, Motion 14.9, Lucide 1.66.

### Sécurité
- **Formulaires de compte en POST** : le mot de passe n'apparaît plus dans l'adresse si l'envoi précède le chargement de la page.
- **Rôles protégés par la RLS** : aucune élévation de rôle possible ; export CSV protégé contre l'injection de formules.

## [0.8.0] — 2026-10-30 — Qualité

- **Tests** : Playwright et axe-core (accessibilité WCAG AA, sécurité, parcours complet, mobile 360 px) ; tâche `e2e` en CI.
- **Corrections** :
  - contrastes ;
  - zones défilantes accessibles au clavier ;
  - titres affichés sans attendre le JavaScript ;
  - un compte déjà configuré va directement au tableau de bord.

## [0.7.0] — 2026-10-30 — Insights, alertes, paramètres

- **Insights** : historique filtrable et impact mesuré.
- **Alertes** : actives par défaut, envoi par email et Slack.
- **Paramètres** en 5 onglets ; anonymisation et suppression du projet.

## [0.6.0] — 2026-10-30 — Écrans d'analyse

- **Churn et rétention** : panneau client, brouillon de relance, cohortes.
- **Autres écrans** : Acquisition, Tunnel, Revenus.

## [0.5.0] — 2026-10-30 — Tableau de bord

- **Navigation adaptée** à l'ordinateur, la tablette et le mobile.
- **Contenu** : période globale, barre de question, accueil « Santé de votre SaaS », insights « Fait / Ignorer ».

## [0.4.0] — 2026-10-30 — Configuration en 2 actions

- **Configuration** : audit réel du site (protégé anti-SSRF), script et Stripe (simulés), écran final.

## [0.3.0] — 2026-10-30 — Comptes

- **Comptes** : inscription, connexion, mot de passe oublié ; Google et GitHub prêts ; emails en français.

## [0.2.0] — 2026-10-29 — Site vitrine

- **Pages** : hero, promesses, « 2 clics », coût du churn, témoignages, tarifs, FAQ, pied de page.
- **Référencement** de base.

## [0.1.0] — 2026-10-29 — Socle et système de design

- **Socle** : Next.js 16, Tailwind 4, Supabase local, Docker, intégration continue, logos.
- **Design** : jetons du brand kit, composants, icônes animées.
