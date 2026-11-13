# Journal des versions

Format inspiré de « Keep a Changelog ». Versions sémantiques : `majeure.mineure.correctif`.

## [Non publié]

### Modifié (lot D : prise en main simplifiée)
- **Inscription en 2 champs** (email, mot de passe) : le prénom est déduit de l'email quand la
  forme est claire (« prenom.nom@ »), sinon « Bonjour. ». L'offre choisie sur la page Tarifs est
  gardée et mise en avant au moment de payer (« Votre choix »).
- **Plus d'écran « Votre SaaS »** quand l'adresse vient du site vitrine : le projet est créé à
  l'arrivée, l'analyse tourne en arrière-plan, et l'onglet de la bonne plateforme s'ouvre dès
  qu'elle est prête.
- **« C'est fait, vérifier mon site »** : SaasClair lit la page d'accueil et dit ce qui manque
  (ligne absente ou non publiée, autre clé, site injoignable) ; trouvée, l'étape est validée.
  Aide affichée au bout de 2 minutes sans visite.
- Moins de jargon : « Reliez votre site » au lieu de « Installez le script », partout.
- **Une seule liste de démarrage** sur l'accueil (« 1 sur 3 », étapes faites cochées) ; les
  cartes ne répètent plus son bouton. « Import Stripe en cours… » pendant l'import.
- **« Je n'utilise pas Stripe »** : question fermée (Paddle, Lemon Squeezy, pas encore de
  paiements), réponse enregistrée (migration `billing_provider`), étape passée.
- Pendant l'import Stripe : « Voir mon tableau de bord pendant l'import ».
- **Connexion par lien magique** (« Sans mot de passe : recevoir un lien par email »), email en
  français aux couleurs de la marque.

### Modifié (analyse du site toujours à jour)
- L'analyse du site n'était faite qu'une fois, à la configuration : une correction (titre,
  description…) ne se voyait jamais. Elle est maintenant relancée seule au-delà de 6 heures (à
  l'ouverture du tableau de bord et par la tâche horaire), et à la demande avec « Analyser
  maintenant » (au plus une fois toutes les 30 secondes). La date de l'analyse est affichée.
- Chaque point de référencement faux dit pourquoi : « 82 caractères : trop long (idéal : 10 à
  70) », « Aucune description trouvée »… Les 6 points sont affichés (le score les compte tous).
- La page est demandée sans cache, pour lire la version en ligne. Migration `audit_refresh`.

### Ajouté (lot C : les 3 promesses tenues sur les vraies données)
- **Moteur d'insights** (`src/features/insights/`) : paiements échoués à récupérer, départs
  programmés, cartes qui expirent avant le prochain paiement, essais qui finissent dans 7 jours,
  churn en hausse (avec l'offre en cause), dépendance à un gros client, problèmes du site
  (HTTPS, mobile, inscription ou tarifs introuvables, lenteur, description et titre pour Google),
  dépendance à un seul canal. Chaque insight cite ses chiffres, dit quoi faire et l'argent en jeu.
- Accueil : « Vos priorités cette semaine » (les 3 premières). Page Insights réelle (à traiter,
  argent en jeu, faits, ignorés). Barre de question qui répond avec les vrais chiffres (churn,
  revenu, canaux, conversion). Alertes de la cloche tirées des mêmes insights.
- **Score de risque explicable** : points par raison (résiliation programmée, impayé, retard,
  paiement échoué, carte qui expire, renouvellement annuel proche, client récent), « à retenir »
  dès 60, « à surveiller » de 35 à 59. Import Stripe : rythme de facturation et mois
  d'expiration de la carte (migration `stripe_risk_signals`), rien d'autre de la carte.
- **Tunnel réel** : visiteurs → tarifs → inscription → inscrits, étape qui perd le plus en or avec
  cause et action, comparaison par appareil et par canal. Page introuvable : question en un
  clic avec la page la plus visitée qui lui ressemble (migration `key_pages`).
- **Revenu par canal** : clients Stripe reliés à leur canal d'arrivée par l'empreinte de leur
  email (fonction `customer_first_touch`, migration `first_touch`), vraie couverture affichée
  dans Acquisition et Paramètres.

### Corrigé (lot C)
- Les dates d'essai et de résiliation (`trial_end`, `cancel_at`) n'étaient pas lues : la
  correction des essais de la version précédente n'agissait pas encore.
- Passer de www.monsaas.fr à app.monsaas.fr n'est plus compté comme une provenance « Autre site ».
- « Fait / Ignorer » acceptait seulement les insights de démonstration.

### Corrigé (audit du 13 novembre 2026, détail dans `AUDIT_ET_PLAN_D_ACTION.md`)
- **Chiffres tronqués au-delà de 1 000 lignes** : visites, abonnements, clients, factures et
  listes de l'administration sont désormais lus page par page (`src/lib/supabase/fetch-all.ts`).
- **Churn** : calculé sur les clients payants au début de la période (plus jamais au-delà de
  100 %), un changement d'offre n'est plus un départ, un essai annulé n'est plus compté comme
  revenu puis comme départ, un essai converti compte en nouveau revenu à sa date de conversion.
  Migration `stripe_trials` (`trial_end`, `cancel_at`), remplie à la prochaine resynchronisation.
- Résiliation programmée à une date précise : le client apparaît à risque. Raisons sans doublon.
- Dernier point du graphique des revenus = revenu affiché. « Churn involontaire » renommé
  « Paiements à récupérer » (c'est ce qu'il mesure).
- **Redirection ouverte** après connexion (`/%09/autre-site`) bloquée.
- **Confirmation d'email obligatoire en production** (emails envoyés par Resend) : personne ne
  peut plus créer un compte au nom d'un autre. Lien de confirmation ouvert dans un autre
  navigateur : message clair, et la conversion « inscription » est comptée au clic sur le lien.
- Actions de démonstration (script détecté, Stripe connecté) refusées hors mode démo.
- Webhook de facturation : une écriture refusée fait rejouer la notification au lieu de la perdre.
- Secret de la resynchronisation Stripe : plus visible dans la liste des processus du serveur.

### Modifié (prise en main)
- L'analyse du site démarre seule quand l'adresse vient du site vitrine (un clic de moins).
- Écran final : plus de « 91 % » ni de « recommandations sous 24 heures » inventés.
- Stripe : « jamais modifié » au lieu de « lecture uniquement » (l'autorisation Stripe est en
  lecture et écriture), avec une phrase qui prévient avant la page de Stripe.
- Jours d'essai restants affichés dans l'en-tête du tableau de bord.
- « Copier le message » à côté de l'envoi au développeur.
- Tunnel et Insights : message d'attente honnête (fonction encore à venir).

### Modifié
- **Nouveaux prix** : Starter 9,99 €, Growth 19,99 €, Pro 29,90 € HT par mois (−20 % en annuel).
  L'offre Pro se paie en ligne comme les autres : plus de « sur devis ». Essai gratuit de 7 jours.

### Ajouté
- **Paiement des abonnements** (Stripe Checkout) : Starter et Growth, mensuel ou annuel (−20 %),
  TVA calculée automatiquement, carte, SEPA et PayPal ; portail client pour changer d'offre ou de
  carte, télécharger ses factures ou résilier. Essai sans carte, puis écran de choix
  d'offre (données conservées). Prix affichés hors taxes.
- **Politique de confidentialité** (`/confidentialite`), liée depuis le pied de page et le plan du
  site : données traitées, cookies, hébergement à Francfort, prestataires, durées, droits.
- **Accueil complet sur les vraies données** : vos revenus (Stripe), vos visiteurs (script) et
  votre site (analyse : pages clés, référencement, vitesse, technologies). Les sections qui ont
  des données passent devant ; les autres indiquent l'action à faire. Plus jamais de page vide.
- **Mise à jour automatique des données Stripe**, chaque heure : nouveaux clients, résiliations
  et paiements échoués apparaissent sans reconnexion. Les écrans gardent leurs chiffres pendant
  la mise à jour.
- **Revenus, Churn et Accueil sur les vraies données Stripe** : revenu mensuel récurrent,
  nouveau revenu, revenu perdu, churn clients et en revenu, paiements échoués, clients à risque
  avec leurs vraies raisons (résiliation programmée, retard, impayé, paiement échoué).
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
