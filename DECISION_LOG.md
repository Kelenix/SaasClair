# Journal de décisions (DECISION_LOG)

> ADR léger. Chaque décision structurante prise par Claude **en autonomie** y est consignée :
> contexte → décision → alternatives écartées → conséquences. Le plus récent en haut.

---

## ADR-023 — Collecte réelle des visites

- **Date** : 2026-10-31
- **Statut** : Accepté
- **Décideur** : utilisateur (« commence la collecte réelle ») ; conception Claude
- **Contexte** : sans collecte, la production n'affichait que des écrans vides (ADR-022). La ligne à installer pointait vers `cdn.saasclair.fr`, un domaine qui n'existe pas.
- **Décision** :
  - **Script** `public/s.js` servi par SaasClair (`https://saasclair.com/s.js`, 2,7 Ko, mis en cache une heure). Il envoie chaque page vue, y compris dans les applications à page unique : page, site d'origine, UTM, largeur d'écran, identifiant aléatoire du visiteur (stockage local du site client). Pas de cookie tiers, pas d'adresse IP. Les robots et `localhost` sont ignorés. `saasclair("identify", email)` envoie une empreinte SHA-256, jamais l'email.
  - **Réception** `POST /api/collect` (texte brut, ouvert à toutes les origines) : validation stricte (Zod, 4 Ko au plus). Le projet est retrouvé par `projects.site_key` (colonne générée, unique). La page doit appartenir au site du projet (avec ou sans www, sous-domaines compris). Le chemin est gardé **sans paramètres** (ils peuvent contenir des données personnelles), et le canal est classé avec la même règle que la provenance des inscrits. La première visite marque le script comme détecté.
  - **Table `events`** : lecture par le propriétaire du site uniquement (RLS), écriture par la clé de service uniquement.
  - **Détection réelle** dans la configuration : interrogation de `/api/script-status` toutes les 4 secondes.
  - **Écran Acquisition** : vraies visites d'abord (visiteurs uniques, pages vues, canaux, sites d'origine, pages d'entrée, campagnes), puis l'exemple (en local seulement), sinon l'écran vide.
  - **Nginx** : les appels internes (adresses privées des conteneurs) ne sont plus limités en débit ; sinon le site et la collecte partageaient une seule limite.
- **Alternatives écartées** : un sous-domaine CDN (un domaine et un certificat de plus, sans gain à ce volume) ; des cookies (consentement plus lourd sur les sites clients) ; une file d'attente (inutile au volume actuel).
- **Conséquences** :
  - Agrégation en JavaScript jusqu'à 50 000 pages vues par période ; au-delà, passage en SQL (dette).
  - Pas encore de durée de conservation des visites.
  - Les inscrits, clients et revenus par canal arrivent avec Stripe (étape 2).
  - Les clients doivent mentionner SaasClair dans leur politique de confidentialité (mesure d'audience).
- **Impact** : technique et métier — élevé.

## ADR-022 — Aucune donnée d'exemple en production

- **Date** : 2026-10-31
- **Statut** : Accepté
- **Décideur** : utilisateur (« en production, tout est vide tant que l'utilisateur n'a rien fourni ; on n'invente rien »)
- **Contexte** : le générateur d'exemple (ADR-002, le SaaS de Nadia) était affiché à tous les comptes, y compris en production. Il simulait aussi la première visite du script et l'import Stripe. Un nouvel utilisateur voyait des chiffres qui n'étaient pas les siens.
- **Décision** : les données d'exemple ne s'affichent que si `DEMO_DATA=true` : sur le poste de développement et dans les tests de la CI, jamais en production (variable absente de `deploy/compose.prod.yaml`). Sans elles :
  - chaque écran du tableau de bord affiche un état vide qui dit ce qui manque, avec un lien vers l'étape à faire ;
  - aucune notification, aucune réponse inventée dans la barre de question, aucun taux de couverture ;
  - la configuration ne simule plus rien : le script attend une vraie première visite, et Stripe annonce que la connexion ouvre bientôt.

  L'espace administrateur lisait déjà uniquement la base réelle. Le site vitrine garde son aperçu illustré.
- **Conséquences** : en production, les écrans restent vides jusqu'à la collecte réelle (dette n° 1 et 2 : script de collecte et Stripe Connect), qui devient la priorité.
- **Impact** : métier — élevé (honnêteté des chiffres).

## ADR-021 — Production sur un VPS partagé, Supabase auto-hébergé

- **Date** : 2026-10-31
- **Statut** : Accepté
- **Décideur** : utilisateur (domaine `saasclair.com`, VPS Hostinger KVM 1 qui héberge déjà 3 à 4 sites, ports 3000 à 3002 pris, « tout sur le VPS, Supabase compris ») ; mise en œuvre Claude
- **Contexte** : le guide DevOps prévoit Supabase Cloud et un serveur dédié. Ici :
  - Supabase tourne sur le même VPS ;
  - le serveur a peu de mémoire libre (≈ 35 % de 4 Go) ;
  - les autres sites ne doivent ni bouger ni tomber.
- **Décision** :
  - **Supabase réduit à 3 services** (`deploy/compose.prod.yaml`) : PostgreSQL, Auth (GoTrue) et API de données (PostgREST), aux versions exactes de la CLI locale. L'application n'utilise ni stockage de fichiers, ni temps réel, ni fonctions : Storage, Realtime, Kong, Studio, Analytics et Edge Runtime sont écartés (≈ 2 Go de mémoire évités). Mémoire bornée par service.
  - **Nginx route l'API** sur `api.saasclair.com`, avec les chemins de Supabase Cloud (`/auth/v1`, `/rest/v1`) : aucun changement dans le code. Débit limité, plus strict sur la connexion.
  - **Ports internes 3110 à 3130, liés à 127.0.0.1** ; un fichier Nginx à part, des noms préfixés `saasclair_`. L'amorçage n'écrase rien d'existant : ni les autres sites, ni SSH, ni le pare-feu. Il s'arrête net en cas de conflit.
  - **Une seule réplique, deux couleurs** (blue et green) : la nouvelle version démarre à côté de l'ancienne, la bascule n'a lieu qu'après un contrôle de santé complet, puis l'ancienne est arrêtée et gardée pour un retour arrière immédiat. Une seule réplique garde le cache des contenus cohérent (`updateTag`) et économise la mémoire.
  - **Secrets nés sur le serveur** (`gen-env.sh`) : mot de passe de la base, secret JWT, clé de service. GitHub ne reçoit que la clé SSH de déploiement et la clé publique `anon`.
  - **Migrations appliquées sur le serveur** par la CD (`migrate.sh`) : même table de suivi que la CLI Supabase, une transaction par migration, sauvegarde automatique avant. La base n'est jamais exposée à Internet.
  - **Image construite par GitHub Actions** et publiée sur GHCR : le VPS ne compile rien.
  - **Répétition locale fidèle** (`deploy/rehearsal.sh`) : mêmes fichiers, même Nginx, sur Docker Desktop.
- **Alternatives écartées** :
  - Supabase Cloud : refusé par l'utilisateur.
  - Pile Supabase officielle complète : trop gourmande pour ce serveur.
  - Deux répliques en permanence : cache incohérent et mémoire doublée.
  - Migrations par tunnel depuis GitHub : le mot de passe de la base aurait quitté le serveur.
- **Conséquences** :
  - Les mises à jour de Supabase se font à la main, après répétition (`docs/deployment.md`).
  - L'utilisateur `deploy` est membre du groupe `docker`, donc équivalent root : sa clé est restreinte (`restrict`) et réservée à la CD.
  - Les sauvegardes restent sur le VPS ; une copie hors serveur reste à mettre en place (dette P1).
- **Impact** : technique — élevé ; coût — nul (VPS existant).

## ADR-020 — Espace super administrateur

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : utilisateur (demande et capture d'écran de référence), mise en œuvre Claude
- **Contexte** : l'utilisateur veut un contrôle total de SaasClair :
  - utilisateurs connectés, provenance et canaux d'arrivée ;
  - clients payants, type d'abonnement, moyen de paiement et gestion des abonnements ;
  - contenus du site (newsletter, témoignages, FAQ, À propos) ;
  - paramètres avec pixels publicitaires, état et évolution du système.

  Les rubriques de la capture sans équivalent sur notre site sont écartées : messages et devis, carrières, partenaires, prospects, portfolio, blog, apps mobiles.
- **Décision** :
  - **`/admin`**, réservé au rôle `super_admin` (table `profiles`, créée à l'inscription par déclencheur). La navigation est groupée comme sur la capture :
    - Tableau de bord ;
    - Clients : Utilisateurs, Abonnements ;
    - Audience : Newsletter ;
    - Contenu du site : Témoignages, FAQ, À propos ;
    - Réglages : Paramètres, État du système.
  - **Données réelles**, lues en base : les profils portent l'offre, le rythme, le moyen de paiement, le statut, l'essai, la provenance et la dernière activité. « Connecté » signifie vu sur le tableau de bord dans les 5 dernières minutes.
  - **Abonnements gérés à la main** depuis la fiche utilisateur tant que Stripe Billing n'est pas branché : offre, statut, prix Pro négocié, prolongation d'essai, suspension. L'historique du revenu est une estimation à partir des abonnés actuels, signalée à l'écran.
  - **Provenance** : le premier contact (UTM, gclid, site référent) est gardé dans un cookie interne, transmis au compte à l'inscription (email, Google ou GitHub), puis classé en 8 canaux.
  - **Contenus du site** (FAQ, témoignages, À propos, réglages) : stockés en base, lus par des fonctions `"use cache"` et rafraîchis par `updateTag` à chaque modification. Sans témoignage publié, la section disparaît.
  - **Newsletter** : formulaire dans le pied de page ; gestion et export CSV dans l'administration.
  - **Pixels** : Google Ads, GA4, Meta et LinkedIn, branchés en collant l'identifiant. La conversion Google Ads « inscription » est envoyée à l'arrivée en configuration.
    - Ils ne se chargent qu'après consentement.
    - Le bandeau RGPD rend le refus aussi simple que l'accord, et « Gérer les cookies » reste dans le pied de page.
  - **Suppression de compte** via la clé de service, côté serveur uniquement. Le super administrateur ne peut ni se supprimer ni changer son propre rôle.
  - **Comptes suspendus** : leur tableau de bord est fermé, avec un message.
  - **Après connexion** : sans page demandée, le super administrateur arrive directement dans `/admin`.
- **Alternatives écartées** :
  - champ « code de suivi libre » : injection de script possible, contraire à la CSP ;
  - Google Tag Manager seul : trop de configuration pour l'utilisateur ;
  - données d'administration simulées : contraires au « contrôle total ».
- **Conséquences** : brancher Stripe Billing remplacera la saisie manuelle par la synchronisation des abonnements, sans changer les écrans.
- **Impact** : sécurité — fort (voir `docs/security.md`) ; légal — moyen (politique de confidentialité à compléter, tâche n° 14).

## ADR-019 — Qualité : tests de bout en bout, accessibilité automatique, performance

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : Claude (rôles : qa-engineer, performance-engineer, security-engineer, code-reviewer)
- **Contexte** : critères de validation de `CLAUDE.md` §7 et incrément 8 de `docs/PLAN.md`.
- **Décision** :
  - **Playwright + axe-core** (`e2e/`) sur l'image de production locale (port 3001), sur ordinateur et à 360 px. Le mode développement est trop lent à compiler pour des tests fiables. En local, les tests utilisent le Chrome installé ; en CI, Chromium, dans un nouveau job `e2e` qui démarre Supabase local et le build autonome.
  - **Formulaires de compte en `method="post"`** : un envoi parti avant que React ne l'intercepte ne met plus jamais le mot de passe dans l'adresse. Lier l'action serveur à l'attribut `action` a été écarté : React interdit `method` dans ce cas, et le formulaire n'existe de toute façon qu'avec JavaScript, puisqu'il lit les paramètres de l'adresse.
  - **`/configuration` redirige vers `/app`** une fois la configuration terminée. L'écran final reste affiché dans le parcours, qui ne recharge pas la page.
  - **Contrastes** : les textes crème sur forêt passent de 50 à 70 % à 75 à 85 % d'opacité. La pulsation des badges n'utilise plus que l'échelle, car la baisse d'opacité faisait passer le texte or sous 4,5:1.
  - **Zones défilantes** focusables et nommées (règle axe `scrollable-region-focusable`).
  - **Performance** :
    - titre du site vitrine et pages de connexion animés en CSS, visibles sans attendre le JavaScript ;
    - maquette du hero animée à l'entrée à l'écran ;
    - détail dans `docs/performance.md`.
- **Conséquences** : 109 tests unitaires et 35 tests de bout en bout. Les mesures Lighthouse mobiles de ce poste ne sont pas fiables : elles seront refaites en production.
- **Impact** : sécurité — fort (mot de passe dans l'adresse) ; accessibilité — moyen ; technique — faible.

## ADR-018 — Insights, alertes et paramètres

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : Claude (rôles : frontend-engineer, backend-engineer, security-engineer)
- **Contexte** : `CLAUDE.md` §5.4 (historique des insights, alertes activées par défaut, paramètres) et règle « configuration zéro ».
- **Décision** :
  - **Insights** : historique de 12 recommandations sur 6 semaines. Les 3 de la semaine sont actionnables (« Fait / Ignorer », en base) ; les anciennes sont figées, avec leur impact mesuré (1 940 € par mois au total). Filtres par sujet et par suivi, dans un panneau qui glisse du bas sur mobile.
  - **Alertes** : table `alert_settings` qui enregistre seulement les alertes **désactivées** (sans ligne, tout est actif et part par email). Slack se branche par un webhook entrant collé par l'utilisateur ; aucune application Slack à valider. L'envoi réel attendra le moteur d'alertes.
  - **Paramètres** en 5 onglets, l'onglet ouvert gardé dans l'adresse (`?onglet=`) :
    - **Projet** : statut du script et de Stripe, ligne de script, page de paiement modifiable, couverture 91 %.
    - **Équipe** : invitation avec validation en direct et 3 rôles expliqués. Démonstration : les invitations ne sont ni envoyées ni enregistrées, et le message le dit.
    - **Abonnement** : essai de 14 jours calculé depuis l'inscription, usage, offres, état vide des factures. Le paiement en ligne viendra avec Stripe Billing.
    - **Confidentialité** : anonymisation (réelle, en base) et suppression **réelle** du projet après confirmation.
    - **Intégrations** facultatives, présentées comme des bonus, « bientôt disponibles ».
  - **Projet de démonstration de Nadia** ajouté à `supabase/seed.sql` (`demo.saasclair.fr`, configuration terminée, page de paiement à confirmer).
  - Composant commun `Segmented` (choix en pilules) pour les filtres et les rôles.
- **Alternatives écartées** : stocker les alertes activées (une nouvelle alerte serait éteinte par défaut, contraire à la consigne) ; application Slack OAuth (validation Slack et configuration inutiles à ce stade).
- **Conséquences** : la page d'attente commune `/app/[section]` est supprimée, et tous les écrans du tableau de bord existent.
- **Impact** : sécurité — moyen (voir `docs/security.md`) ; fonctionnel — moyen (invitations et intégrations simulées).

## ADR-017 — Écrans Churn, Acquisition, Tunnel et Revenus

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : Claude (rôles : frontend-engineer, system-design, ui-ux-designer)
- **Contexte** : `CLAUDE.md` §5.4 (écrans d'analyse, Churn et rétention en écran phare).
- **Décision** :
  - **Un module de données par écran** (`churn/data.ts`, `acquisition/data.ts`, `tunnel/data.ts`, `revenue/data.ts`) qui réutilise les fonctions communes (`demo-utils.ts`, `revenueBuckets`, `getFunnel`, `getChannels`). Les clients suivis et les paiements échoués vivent dans `customers.ts` : l'accueil, le Churn et les Revenus montrent les mêmes.
  - **Cohérence entre écrans (testée)** : le taux essai → payant du tunnel égale celui de l'accueil ; le revenu retombe sur 25 000 € en fin de période ; les 4 clients « à risque élevé » sont ceux de l'accueil.
  - **Contraction ajoutée** aux flux mensuels (152 €, expansion portée à 760 € : solde inchangé). Sur l'accueil, « Perdu » regroupe départs et baisses d'offre.
  - **Liste de surveillance** : 4 clients à risque élevé (score ≥ 60) et 5 aux premiers signes. Panneau latéral avec signaux, usage, chronologie et **brouillon d'email modifiable** (copie ou `mailto:`). Rien n'est envoyé par SaasClair ; l'accueil ouvre directement le panneau (`/app/churn?client=…`).
  - **Paiements échoués** : bouton « Relancer » à effet immédiat. En démonstration, aucun email n'est envoyé, et le message le dit.
  - **Mobile** : chaque tableau devient une liste de cartes ; la carte de chaleur et les graphiques à colonnes défilent horizontalement.
  - **Tunnel** : barres à largeur adoucie (racine carrée) pour que l'étape « Paiement » reste visible. Une mention l'indique, et les chiffres affichés restent exacts.
  - **Correctifs** :
    - les mois de la période 12 mois sont désormais des mois calendaires (avant, « mars » apparaissait deux fois) ;
    - `getPeriod` force le rendu à la requête (`connection()`), car les chiffres dépendent de la date du jour ;
    - les particules de l'écran final de configuration sont arrondies (écart serveur / navigateur).
- **Conséquences** : brancher les vraies données = remplacer ces fonctions `get…Data`, sans toucher aux composants.
- **Impact** : technique — moyen.

## ADR-016 — Tableau de bord : structure, période globale, données de démo cohérentes

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : Claude (rôles : frontend-engineer, system-design, ui-ux-designer)
- **Contexte** : `CLAUDE.md` §5.4 (structure responsive + accueil « Santé de votre SaaS »).
- **Décision** :
  - **Navigation** : barre latérale vert forêt repliable (préférence gardée dans le navigateur via `useSyncExternalStore`), icônes seules sur tablette, barre du bas + panneau « Plus » sur mobile.
  - **Période globale** : mémorisée dans un cookie (`sc_periode`) pour suivre l'utilisateur d'écran en écran ; le sélecteur bouge tout de suite, la page se recalcule côté serveur et s'estompe légèrement pendant ce temps. « Personnalisé » est ramené à la période standard la plus proche (démonstration).
  - **Grilles en requêtes de conteneur** (`@container`) : elles suivent la largeur réelle du contenu, qui varie avec la barre latérale.
  - **Données de démo** : un seul module déterministe (`demo-data.ts`) ; la croissance du revenu est calculée à partir des mêmes flux que le graphique (testé). Flux mensuels : 2 150 € de nouveaux clients, 608 € d'expansion, 1 750 € perdus (7 % de churn).
  - **Graphiques maison** (SVG/HTML animés) plutôt que Recharts : plus légers, aux couleurs de la marque, avec tableau équivalent pour les lecteurs d'écran (remplace la partie « Recharts » d'ADR-006).
  - **Insights** « Fait / Ignorer » enregistrés en base (`insight_feedback`, RLS) avec interface optimiste et annulation ; **barre de question** à réponses rédigées de démonstration ; **bandeau en un clic** pour confirmer la page de paiement (`projects.checkout_url`).
  - Écrans Acquisition, Tunnel, Churn, Revenus, Insights, Paramètres : page d'attente commune jusqu'aux incréments 6 et 7.
- **Conséquences** : brancher les vraies données = remplacer `getHomeData` et `answerQuestion`, sans toucher aux composants.
- **Impact** : technique — moyen.

## ADR-015 — Configuration en 2 actions : audit réel, détection et Stripe simulés

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : Claude (rôles : backend-engineer, database-architect, ui-ux-designer)
- **Contexte** : `CLAUDE.md` §5.3 et réponse Q1 (vrai audit d'URL, collecte et Stripe simulés).
- **Décision** :
  - Table `projects` (un projet par compte, RLS, étapes ordonnées par contrainte SQL) ; l'avancement est enregistré à chaque étape et le parcours reprend après rechargement.
  - **Étape 0 — audit réel** de la page d'accueil côté serveur (`src/features/setup/fetch-site.ts`) : pages clés, vitesse, référencement, technologies. Protégé contre le SSRF (adresses internes refusées à chaque redirection, délai de 8 s, 1,5 Mo maximum). Site injoignable : message rassurant, on peut continuer.
  - **Étape 1** : 5 plateformes illustrées, copie en un clic, envoi au développeur via la messagerie de l'utilisateur (`mailto:`, aucun service d'email nécessaire). Détection **simulée** 5 s après la copie, signalée à l'écran comme démonstration.
  - **Étape 2** : bouton Stripe, mention « lecture seule », Paddle/Lemon Squeezy annoncés « bientôt » (v1.2 au .docx). Connexion et import **simulés** (340 clients, 3 912 paiements, 352 abonnements, couverture 91 %).
  - Écran final : particules aux couleurs de la marque, résumé, transition vers `/app` (page provisoire, remplacée à l'incrément 5).
- **Alternatives écartées** : bloquer la suite si le site est injoignable (contraire à « configuration zéro ») ; service d'envoi d'email pour le développeur (coût et configuration inutiles).
- **Conséquences** : quand la collecte réelle et Stripe Connect arriveront, seules `markScriptDetected` et `connectStripe` changent de déclencheur ; l'interface reste.
- **Impact** : technique — moyen ; sécurité — fort (SSRF, RLS testée avec un second compte).

## ADR-014 — Authentification : Supabase Auth, actions serveur, proxy

- **Date** : 2026-10-30
- **Statut** : Accepté
- **Décideur** : Claude (rôles : backend-engineer, security-engineer)
- **Contexte** : `CLAUDE.md` §5.2 : email + Google + GitHub, validation en temps réel, arrivée directe dans la configuration.
- **Décision** :
  - Supabase Auth via `@supabase/ssr` ; actions serveur (`src/features/auth/actions.ts`) revalidant avec les mêmes schémas Zod que le formulaire.
  - `src/proxy.ts` (ex-middleware de Next 16) limité aux pages qui dépendent de la session : le site vitrine reste statique.
  - Prénom stocké dans les métadonnées du compte (`first_name`) pour « Bonjour Nadia » ; aucune table créée à ce stade.
  - Adresse saisie sur le site vitrine transmise `?site=` → inscription → `/configuration?site=…`, y compris après Google/GitHub et confirmation d'email.
  - **Ajouts non demandés explicitement mais indispensables à un produit fini** : « Mot de passe oublié » et « Nouveau mot de passe », emails en français aux couleurs de la marque.
  - Google/GitHub : boutons prêts ; le fournisseur est vérifié avant la redirection pour afficher un message clair tant qu'il n'est pas activé (tâches n° 3 et 4).
  - Compte de démonstration local dans `supabase/seed.sql`.
- **Alternatives écartées** : NextAuth/Auth.js (doublon avec Supabase, RLS plus complexe) ; liens magiques seuls (non demandés).
- **Conséquences** : `/configuration` est une page d'arrivée provisoire, remplacée par le parcours complet à l'incrément 4.
- **Impact** : sécurité — fort (voir `docs/security.md`).

## ADR-013 — Hero centré avec grande maquette du tableau de bord

- **Date** : 2026-10-29
- **Statut** : Accepté (remplace le hero en deux colonnes de l'exemple du brand kit)
- **Décideur** : utilisateur (référence visuelle fournie), mise en œuvre Claude
- **Contexte** : l'utilisateur veut un hero centré, comme sa référence, avec une grande maquette qui présente le tableau de bord de l'application.
- **Décision** : titre centré en Fraunces (76 px sur ordinateur), champ d'adresse centré, puis grande fenêtre de l'application (barre latérale vert forêt, accueil « Santé de votre SaaS » de Nadia, 4 indicateurs, courbe de revenu, clients à risque), pastille des 2 actions cochées, alerte « 3 clients à relancer », téléphone flottant (≥ 1280 px) et bandeau de 4 chiffres issus du cahier des charges (2 actions, 5 min, 91 %, 24 h). Le bleu de la référence est remplacé par un halo de marque (émeraude, touche d'or, fond crème). Sur mobile : la maquette perd la barre latérale et le téléphone, et les indicateurs passent en 2 colonnes.
- **Conséquences** : la maquette préfigure fidèlement l'écran d'accueil à construire (incrément 5).
- **Impact** : marque — moyen (écart volontaire avec l'exemple du brand kit, validé par l'utilisateur).

## ADR-012 — Site vitrine : contenus provisoires et choix éditoriaux

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôles : product-owner, seo-engineer)
- **Contexte** : `CLAUDE.md` §5.1 demande témoignages, tarifs et FAQ ; le .docx ne donne ni témoignages ni volumes précis pour Growth.
- **Décision** :
  - **Témoignages** : 3 exemples réalistes, signalés dans le code et dans `docs/manual-tasks.md` (n° 8) comme **à remplacer avant la mise en ligne**.
  - **Volumes des offres** : Starter 50 000 visites / mois (.docx « ~50 k événements », reformulé sans jargon) ; Growth **200 000 visites / mois** et **5 membres** = hypothèses.
  - **Annuel** : −20 % arrondi à l'euro (23 € et 63 € par mois).
  - **Pas de promesse non demandée** : ni « sans carte bancaire » ni « sans engagement ».
  - **Pages légales** : non publiées tant que les informations de la société manquent (tâche n° 9) ; pas de liens morts dans le pied de page.
  - **Adresse saisie** transmise par `?site=` jusqu'à l'inscription puis à l'étape 0 (une adresse de site publique n'est pas une donnée sensible).
  - **Référencement** : métadonnées, canonique, `robots.txt`, `sitemap.xml`, données structurées `SoftwareApplication`, image de partage générée depuis les logos (`npm run logos`). `/design` exclu de l'indexation.
- **Impact** : métier — moyen (témoignages et volumes à confirmer) ; légal — bloquant pour la mise en ligne, pas pour le développement.

## ADR-011 — Ports Supabase locaux décalés (5532x)

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : devops-engineer)
- **Contexte** : un autre projet Supabase local (« chantelyo ») occupe déjà les ports par défaut 5432x sur le poste.
- **Décision** : SaasClair utilise 55321 (API), 55322 (base), 55323 (Studio), 55324 (emails de test). Le relais `net` de `compose.yaml` et `.env.example` suivent. L'autre projet n'est pas touché.
- **Conséquences** : les deux projets tournent en même temps. Studio : http://127.0.0.1:55323.
- **Impact** : technique — nul.

## ADR-010 — Variantes de couleur accessibles

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : ui-ux-designer)
- **Contexte** : `CLAUDE.md` exige des contrastes conformes. Mesurés par un test automatique (`src/design-tokens.test.ts`) : l'émeraude pure en texte sur crème (2,4:1), l'or foncé du brand kit `#B7791F` (3,4:1) et le texte forêt sur bouton émeraude (3,8:1) n'atteignent pas 4,5:1.
- **Décision** : textes en `--emerald-ink #047857` et `--gold-ink #8F5F00` ; texte des boutons émeraude en `--forest-deep #043A2C` (5:1). Les couleurs pures restent pour les fonds, graphiques, points et jauges. Rouge d'erreur `--danger #B4432F` (absent du brand kit).
- **Alternatives écartées** : garder les valeurs du brand kit (non conforme AA) ; agrandir tous ces textes (casse la hiérarchie).
- **Conséquences** : écart visuel quasi imperceptible ; conformité vérifiée à chaque exécution des tests.
- **Impact** : marque — faible ; accessibilité — fort.

## ADR-009 — Icônes animées : Lucide + animations CSS maison

- **Date** : 2026-10-29
- **Statut** : Accepté (remplace la partie « icônes » d'ADR-006)
- **Décideur** : Claude (rôle : frontend-engineer)
- **Contexte** : le registre « lucide-animated » impose un fichier de composant Motion par icône, chacune pilotée en JavaScript.
- **Décision** : un seul composant `Icon` (`src/components/brand/icon.tsx`) enveloppe n'importe quelle icône Lucide. Animations en CSS pur (`globals.css`) : apparition avec ressort, animation au survol ou au focus de l'icône ou de son bouton / lien parent (pop, wiggle, nudge, bounce, spin, tilt), contraction au clic. Uniquement des transformations ; simple fondu si « réduire les animations ».
- **Alternatives écartées** : lucide-animated (beaucoup de code, JavaScript côté client pour chaque icône).
- **Conséquences** : zéro JavaScript pour les icônes, rendu serveur possible, toutes les icônes animées par construction.
- **Impact** : technique — faible.

## ADR-008 — Tarifs affichés : 29 € / 79 € / sur devis

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : utilisateur (réponse à Q2)
- **Contexte** : le .docx §12 ne donne que des fourchettes (Starter 19–29 €, Growth 59–99 €, Pro sur devis).
- **Décision** : Starter 29 €/mois, Growth 79 €/mois, Pro sur devis ; −20 % en annuel ; essai gratuit de 14 jours.
- **Impact** : métier / financier — validé par l'utilisateur.

## ADR-007 — Logos : fichiers fournis, détourés, version inversée dérivée

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : ui-ux-designer)
- **Contexte** : les deux logos sont des JPEG sur fond gris clair (pas de transparence). Posés tels quels sur le crème ou le vert forêt, ils afficheraient un rectangle gris. Le brand kit prévoit une « version inversée » (Saas en crème, Clair en émeraude) sur fond forêt. Consigne : ne pas redessiner le logo.
- **Décision** : à partir des fichiers fournis uniquement, (1) supprimer le fond gris (détourage → PNG/WebP transparents), (2) dériver la version inversée en recolorant les lettres forêt en crème, comme le brand kit, (3) favicon et icônes d'app générés depuis le monogramme. Aucun tracé recréé en code.
- **Alternatives écartées** : redessiner en SVG (interdit) ; afficher les JPEG bruts (rectangle gris, illisible sur fond forêt).
- **Conséquences** : rendu propre partout ; qualité limitée par la résolution des JPEG. Si des fichiers vectoriels (SVG) existent, ils les remplaceront (tâche manuelle facultative).
- **Impact** : marque — faible.

## ADR-006 — Bibliothèques d'animation, d'icônes et de graphiques

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : frontend-engineer)
- **Contexte** : `CLAUDE.md` exige des animations à 60 i/s (position, échelle, opacité), **aucune icône statique**, des graphiques qui se dessinent, et le respect de « réduire les animations ».
- **Décision** : **Motion** (ex-Framer Motion, v14) pour toutes les animations (`LazyMotion` + `MotionConfig reducedMotion="user"`) ; icônes : voir ADR-009 ; **graphiques SVG maison animés avec Motion** (tracé `pathLength`, barres depuis la base, jauges) pour les mini-courbes, tunnel, jauges et carte de chaleur, et **Recharts 3** chargé en différé pour les graphiques à axes.
- **Alternatives écartées** : GSAP (licence/poids, doublon avec Motion) ; Lottie (fichiers lourds, peu personnalisables aux couleurs) ; Chart.js (canvas, moins accessible).
- **Conséquences** : une seule lib d'animation ; graphiques accessibles (SVG + texte alternatif).
- **Impact** : technique — faible.

## ADR-005 — Langue : français uniquement

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : product-owner)
- **Contexte** : le .docx demande FR + EN ; `CLAUDE.md` (plus récent) impose une interface entièrement en français.
- **Décision** : français uniquement, sans couche i18n (YAGNI). L'anglais sera une évolution.
- **Conséquences** : moins de code ; ajouter l'anglais demandera d'extraire les textes plus tard.
- **Impact** : fonctionnel — faible.

## ADR-004 — Nom du produit : SaasClair

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : product-owner)
- **Contexte** : le .docx utilise « SaaSLens (nom provisoire) » ; `CLAUDE.md`, le brand kit et les logos utilisent « SaasClair ».
- **Décision** : SaasClair partout. Le .docx sert uniquement de référence fonctionnelle.
- **Impact** : marque — nul (déjà tranché par les sources).

## ADR-003 — Stack : Next.js 16 + Supabase + Tailwind 4 + shadcn/ui

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : solution-architect)
- **Contexte** : aucune stack imposée ; le skill fixe un défaut ; le .docx suggère Next.js + TypeScript + Tailwind.
- **Décision** : Next.js 16 (App Router, TypeScript strict, React 19), Tailwind CSS 4 (jetons du brand kit en `@theme`), shadcn/ui (primitives Radix accessibles), TanStack Query, Zod, Supabase (Auth + Postgres + RLS), Vitest + Playwright. Dev sous Docker Desktop (`npm run up`). ClickHouse / file de messages / Python du .docx reportés à la phase « collecte réelle ».
- **Alternatives écartées** : Vite SPA (pas de rendu serveur pour le SEO du site vitrine) ; backend Go (non nécessaire à ce stade).
- **Conséquences** : site vitrine statique et rapide, tableau de bord découpé en routes chargées à la demande.
- **Impact** : technique — moyen (difficile à changer ensuite).

## ADR-002 — Données analytiques derrière une couche d'accès unique

- **Date** : 2026-10-29
- **Statut** : Accepté (Q1 validée par l'utilisateur : produit complet sur données de démo + vraie auth + vrai audit d'URL)
- **Décideur** : Claude (rôle : system-design)
- **Contexte** : `CLAUDE.md` demande des données de démonstration réalistes pour tout le produit (SaaS de Nadia). La collecte réelle (script, ingestion, Stripe) est un chantier de plusieurs semaines.
- **Décision** : un générateur de données de démo **déterministe** (graine fixe : 25 000 € MRR, 7 % de churn, ≈ 340 clients, entreprises inventées) exposé via des fonctions d'accès typées (`getHealth(period)`, `getAtRiskCustomers()`…). Les écrans ne connaissent que ces fonctions : brancher les vraies données plus tard ne touchera pas l'interface.
- **Alternatives écartées** : données codées en dur dans chaque composant (incohérences entre écrans) ; fausses données en base (complexité inutile).
- **Impact** : technique — faible.

## ADR-001 — Sources du besoin et priorité entre elles

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Décideur** : Claude (rôle : ai-project-director)
- **Contexte** : trois sources décrivent le besoin ; `INTAKE.md` contient le texte de mission (identique à `CLAUDE.md`).
- **Décision** : `INTAKE.md` / `CLAUDE.md` (le plus récent, le plus détaillé sur l'UX) > brand kit (style) > .docx (fonctionnel et non fonctionnel). La reformulation et les hypothèses de Claude sont dans `docs/PLAN.md` §1 bis.
- **Impact** : métier — faible (aucune contradiction majeure hors ADR-004/005).

---

## ADR-000 — Modèle d'enregistrement

- **Date** : 2026-10-29
- **Statut** : Accepté
- **Contexte** : ce fichier établit le format des décisions.
- **Décision** : utiliser ce gabarit pour toute décision ayant un impact sur l'architecture, les dépendances, la sécurité, le coût ou le comportement produit.
- **Conséquences** : traçabilité complète ; l'utilisateur peut revenir sur tout choix.
