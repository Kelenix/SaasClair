# SaasClair — Audit complet et plan d'action

> Date : 13 novembre 2026. Trois audits menés en parallèle : **sécurité**, **données et calculs**,
> **prise en main**. Chaque constat a été vérifié dans le code avant d'être retenu.
> Ce fichier se lit en 10 minutes. Les sections 1 à 4 suffisent pour décider. La section 5 donne
> le détail.

---

## 1. Résumé en 30 secondes

- **Le socle est solide.**
  - Lint, types et tests passent.
  - Aucune vulnérabilité dans les dépendances.
  - La RLS est activée partout.
  - Le webhook Stripe est signé et l'OAuth protégé.
  - Le serveur est durci.
- **Trois promesses du produit sur trois ne sont pas encore tenues en production.**
  1. **D'où viennent les clients** : on voit les visiteurs par canal, mais pas les clients ni le
     revenu par canal. Rien ne relie un visiteur à un client Stripe.
  2. **Pourquoi ils n'achètent pas** : l'écran Tunnel est toujours vide en production.
  3. **Qui va partir** : seulement les départs déjà annoncés et les paiements échoués. Il n'y a
     pas encore de prédiction.
  - Les insights, la barre de question et les notifications n'ont encore aucun moteur réel.
- **J'ai trouvé et corrigé des chiffres faux**, avec un **bug critique** : au-delà de 1 000
  visites, abonnements ou clients, les données étaient coupées sans erreur. J'ai aussi corrigé
  plusieurs erreurs de calcul du churn (section 2).
- **Le parcours compte encore 7 écrans, 8 à 10 clics et 5 à 6 décisions** avant le premier vrai
  chiffre. La cible proposée : **4 écrans, environ 5 clics**, avec des constats utiles dès la
  première seconde (section 4, lot D).
- **Le risque de sécurité n°1 est réglé** : Resend est configuré et la confirmation d'email est
  activée. Elle sera en ligne à la fusion de la PR n° 1 (section 3).

---

## 2. Ce que j'ai déjà corrigé aujourd'hui

Rien n'est encore envoyé sur GitHub : les modifications sont sur votre poste, **non commitées**.
Elles seront en ligne dès que vous m'aurez dit de les commiter et de les pousser sur `main` :
le déploiement automatique applique aussi la nouvelle migration.

| # | Correction | Pourquoi | Fichiers |
|---|-----------|----------|----------|
| 1 | **Lecture par pages de toutes les grandes listes** | Le serveur coupe chaque réponse à 1 000 lignes sans le signaler. Exemple : 2 000 visites sur 30 jours → la moitié des visiteurs disparaissait. | `src/lib/supabase/fetch-all.ts` (+ tests), `collect/queries.ts`, `stripe/queries.ts`, `admin/queries.ts`, export newsletter |
| 2 | **Taux de churn juste** | Le calcul pouvait afficher 150 %. Il ne compte plus que les clients payants au début de la période, et un changement d'offre n'est plus un départ. | `stripe/metrics.ts` |
| 3 | **Essais gratuits** | Un essai annulé était compté en nouveau revenu, puis en départ : 13 % de churn affiché au lieu de 7 %. Les dates d'essai sont maintenant importées. | migration `20261113120000_stripe_trials.sql`, `normalize.ts`, `metrics.ts` |
| 4 | Résiliation programmée à une date précise | Ces clients n'apparaissaient pas « à risque ». | `metrics.ts` |
| 5 | Raisons de risque en double, dernier point du graphique différent du chiffre affiché | Incohérences visibles par l'utilisateur. | `metrics.ts` |
| 6 | « Churn involontaire » renommé « Paiements à récupérer » | L'indicateur montrait les factures impayées sur 12 mois, pas un churn de la période. | `stripe/real-views.tsx` |
| 7 | **Redirection ouverte** après connexion | Un lien `…/connexion?next=/%09/faux-site.com` envoyait la victime vers un faux site après sa connexion (hameçonnage). | `src/lib/safe-redirect.ts` (+ tests) |
| 8 | Actions « script détecté » et « Stripe connecté » réservées au mode démo | En production, n'importe quel compte pouvait marquer ces étapes comme faites sans les avoir faites. | `setup/actions.ts` |
| 9 | Webhook de facturation | Une écriture refusée était ignorée, et l'abonnement payé pouvait ne jamais s'appliquer. Elle fait maintenant rejouer la notification. | `api/billing/webhook/route.ts` |
| 10 | Secret de la resynchronisation horaire | Il était visible dans la liste des processus du serveur (`ps`). | `deploy/scripts/stripe-sync.sh` |
| 11 | **Analyse lancée toute seule** quand l'adresse vient du site vitrine | Un clic de moins, et la promesse « L'analyse démarre juste après » devient vraie. | `setup/step-site.tsx`, test de bout en bout adapté |
| 12 | **Écran final honnête** | Il affichait « 91 % de vos clients reliés » (chiffre inventé) et « recommandations sous 24 h » (n'existe pas). Contraire à votre règle « aucune donnée inventée ». | `setup/step-done.tsx` |
| 13 | **Textes Stripe cohérents** | Le site promettait « lecture uniquement » alors que Stripe affiche « lecture et écriture ». Partout : « jamais modifié ». Une phrase prévient aussi avant la page de Stripe. | 9 fichiers (site vitrine, connexion, configuration, paramètres) |
| 14 | Jours d'essai restants dans l'en-tête | La fin de l'essai tombait par surprise. | `app/app/layout.tsx` |
| 15 | « Copier le message » à côté de « Envoyer à mon développeur » | Sans logiciel de messagerie, le bouton email ne faisait rien. | `setup/step-script.tsx` |
| 16 | Barre de progression : plus d'étape « 0 » | Elle contredisait « 2 actions ». | `setup/setup-progress.tsx` |
| 17 | Tunnel et Insights : message d'attente honnête | Ils annonçaient des résultats qui n'arrivaient jamais. | `app/app/tunnel`, `app/app/insights` |

Vérifié : lint, types, 162 tests unitaires (dont 14 nouveaux) et construction de production.
**Pas encore vérifié** : les tests de bout en bout (Playwright) et un passage à l'écran dans le
navigateur. Il faut Docker et Supabase lancés (`npm run up`) : je les fais au prochain lot.

---

## 3. Ce que VOUS devez faire vous-même

Ces actions demandent vos comptes, vos clés ou un accès au serveur. Je ne peux pas les faire à
votre place. Elles sont classées par urgence. Le détail pas à pas des tâches déjà connues est
dans `docs/manual-tasks.md` (les numéros renvoient à ce fichier).

### Urgent : avant d'ouvrir les inscriptions au public

| Priorité | Action | Pourquoi | Temps |
|---|---|---|---|
| ✅ | **Emails avec Resend (tâche 11)** : fait par vous. J'ai activé la confirmation d'email dans `deploy/compose.prod.yaml` : elle sera en ligne dès la fusion de la PR n° 1. **Juste après la fusion**, testez une inscription avec une vraie adresse, et « mot de passe oublié ». | C'était la faille la plus grave : sans confirmation, n'importe qui pouvait créer un compte avec l'email d'un autre. | 5 min de test |
| **2** | **Compte super administrateur en production** (tâche 12) | Sans lui, vous ne pouvez pas administrer. | 5 min |
| **3** | **Paiement des abonnements** (tâche 15) : Stripe Tax, SEPA, PayPal, puis `billing-setup.sh` sur le serveur | Sans lui, vous ne pouvez pas encaisser. | 30 min |
| **4** | **Vrais témoignages** (tâche 8). Publier de faux avis est interdit. | Obligation légale. | Variable |
| **5** | **Mentions légales et relecture juridique** de la confidentialité (tâche 9) | Obligation légale. Points à faire valider : durée de conservation des visites, empreinte des emails (voir lot A). | Avec un juriste |
| **6** | **Email de contact** dans Administration › Paramètres (tâche 10) | Le bouton « Nous contacter » est vide sinon. | 2 min |

### Important : dans le mois qui suit

| Action | Pourquoi |
|---|---|
| ✅ **Connexion Google et GitHub** (tâches 3 et 4) : déjà activées en production (vérifié le 13 novembre après la mise en ligne). | Rien à faire. |
| **Surveillance externe gratuite** (UptimeRobot ou Better Stack) sur `https://saasclair.com/api/health`, toutes les 5 min, alerte par email | Si le site tombe, personne n'est prévenu. |
| **Sauvegardes hors du serveur** : activer les sauvegardes Hostinger du VPS, ou un stockage objet | Les sauvegardes de nuit restent sur le même serveur. S'il est perdu, tout est perdu. |
| **Clé Stripe restreinte en lecture** pour l'import des comptes clients, distincte de la clé de facturation. Je vous guiderai : c'est à confirmer sur votre compte Stripe. | Si la clé actuelle fuitait, elle donnerait l'écriture sur le Stripe de tous vos clients. |
| **Restreindre la clé SSH de déploiement** à la seule commande `deploy.sh`, dans `authorized_keys` sur le serveur. Je prépare la ligne exacte. | Le compte de déploiement équivaut à un accès administrateur au VPS, qui héberge aussi vos 7 autres sites. |
| **Mesure de performance mobile** sur PageSpeed Insights (`https://saasclair.com`) | Non mesurable de façon fiable sur votre poste. |

### Décisions à prendre (une réponse courte suffit)

1. **Écrans vides** : afficher une illustration fixe, clairement étiquetée « À quoi ressemblera
   cet écran », à la place de « Pas encore de données » ? Votre règle « aucune donnée de test en
   production » reste respectée : c'est un dessin, pas des chiffres.
2. **Essai de 7 jours** : le faire démarrer **à l'arrivée des premières données** plutôt qu'à la
   création du compte ? Aujourd'hui, si le développeur met 3 jours à installer la ligne, il ne
   reste à l'utilisateur que 4 jours de données.
3. **Durées de conservation** : visites 25 mois et identifiant visiteur 13 mois, comme le
   recommande la CNIL ? Ce sera à faire valider par votre juriste.
4. ~~**Ordre des lots**~~ : lot C fait (13 novembre). Suite recommandée : **D → A → B**.
5. **Relier automatiquement les inscrits à leurs visites (lot C4, partie restante)** : le script
   lirait l'email saisi dans le formulaire de la page d'inscription détectée, et n'en enverrait
   que l'empreinte. Aujourd'hui, il faut ajouter une ligne `saasclair("identify", email)`, ce qui
   contredit un peu la « configuration zéro ». C'est une donnée personnelle (pseudonymisée) :
   à valider avec votre juriste et à mentionner dans la politique de confidentialité.
6. **Même visiteur sur `www.` et `app.`** : l'identifiant du visiteur est aujourd'hui gardé dans
   le navigateur, site par site. Pour le partager entre vos sous-domaines, il faudrait un cookie
   sur le domaine principal (13 mois au plus). Or le script promet aujourd'hui « sans cookie » :
   à décider avec la question 5.

---

## 4. Ce que je propose de faire ensuite (vous me dites « lance le lot X »)

Effort : **S** = moins d'une demi-journée · **M** = 1 à 2 jours · **L** = 3 jours ou plus.
Tout ce qui suit est faisable par moi, sans compte externe, sauf mention contraire.

### Lot C — Tenir les 3 promesses : ✅ fait le 13 novembre (PR n° 2)

Fait : C1, C2, C3, C5 en entier ; C4 sauf la capture automatique de l'email et le cookie entre
sous-domaines (décisions 5 et 6 ci-dessus). Pas encore fait, faute de données : rétrogradation
récente et remise qui se termine (lot B5), baisse d'usage de l'app (après la décision 5).


| Étape | Effort | Ce que ça change pour l'utilisateur |
|---|---|---|
| C1. **Moteur d'insights à partir de Stripe** : argent à récupérer, départs annoncés avec leur date, cartes qui expirent, essais qui finissent cette semaine, churn par rapport à la période précédente, offre qui perd le plus de clients. Branché sur l'Accueil, la page Insights, la barre de question et les notifications. | M | Des recommandations chiffrées en euros **une minute après la connexion de Stripe**. |
| C2. **Insights du « premier jour » tirés de l'analyse du site** : « Page de tarifs introuvable », « Pas de description pour Google », « Accueil lent : 1,9 s ». Format constat → action → Fait / Ignorer. | S | Le tableau de bord n'est **jamais vide**, même sans script ni Stripe. |
| C3. **Tunnel sans configuration** : visite → tarifs → inscription → client Stripe → essai → payant. Les pages viennent de l'analyse du site ; en cas de doute, une question en un clic (« Est-ce votre page d'inscription ? »). | M | Promesse n°2 tenue. |
| C4. **Relier visiteurs et clients sans configuration** : empreinte de l'email lue à l'envoi du formulaire d'inscription détecté (validation RGPD nécessaire), identifiant visiteur ajouté aux liens de paiement Stripe, identifiant partagé entre `www.` et `app.`, comparaison des empreintes, vrai taux de couverture affiché. | M | Promesse n°1 tenue : le revenu par canal. |
| C5. **Score de risque plus prédictif** : points additifs expliqués (factures échouées, carte qui expire avant le renouvellement, rétrogradation récente, remise qui se termine, ancienneté, renouvellement annuel proche, baisse d'usage de l'app). Seuils : « à surveiller » de 35 à 59, « à retenir » à 60 et plus. | M | Promesse n°3 : repérer avant l'annonce du départ. |

### Lot D — Simplifier la prise en main (parcours cible : 4 écrans, environ 5 clics)

**✅ Fait le 13 novembre (PR n° 4)** : D1, D2, D3, D4, D5, D6, D7, D10 (lien magique). D8 sans
objet (le tunnel réel ne se sert pas de la page de paiement), D9 inutile (Google et GitHub
actifs). Reste de D10 : les emails de démarrage (J0, J+1, fin d'essai), qui demandent un envoi
d'emails par l'application elle-même.

| Étape | Effort | Détail |
|---|---|---|
| D1. **Bouton « C'est fait, vérifier mon site »** sur l'étape script | S | SaasClair lit la page d'accueil et y cherche la ligne et la bonne clé. Diagnostic clair : « ligne introuvable, site publié ? » ou « clé différente ». Aide affichée au bout de 2 minutes au lieu d'une attente sans fin. |
| D2. **Étape 0 fusionnée dans l'inscription** | M | L'adresse est saisie une seule fois et analysée en arrière-plan. La configuration n'a plus que les 2 vraies actions. |
| D3. **Une seule liste de démarrage** (« 1 sur 3 », repliable) | M | Elle remplace les 3 rappels qui se répètent aujourd'hui sur l'Accueil : bandeau, cartes et écrans vides. |
| D4. **Question fermée « Je n'utilise pas Stripe »** : Paddle, Lemon Squeezy, pas encore de paiements, inviter la personne qui gère Stripe | S-M | Ce qui est promis (« nous vous écrivons ») devient réel : une liste d'attente est enregistrée. |
| D5. **Moins de jargon** | S | « Installez le script » devient « Reliez votre site ». Les détails techniques (`</head>`, gabarit…) passent dans un bloc repliable « Pour votre développeur ». |
| D6. **Inscription en 2 champs** (email, mot de passe ; le prénom est demandé plus tard) et offre choisie sur la page Tarifs gardée jusqu'au paiement | S | Moins de friction. Aujourd'hui, le choix d'offre est perdu. |
| D7. **Accès au tableau de bord pendant l'import Stripe** | S | L'import tourne déjà en arrière-plan : inutile de bloquer l'écran. |
| D8. **Question sur la page de paiement en production**, en partant de la page de tarifs détectée | S | Aujourd'hui, elle n'existe qu'en démonstration. |
| ~~D9. Masquer Google et GitHub~~ | — | Inutile : les deux sont déjà actifs en production. |
| D10. *(SMTP nécessaire)* **Connexion par lien magique** et emails de démarrage : J0 instructions, J+1 « votre site n'est pas encore relié », J-2 fin d'essai | M | Gros levier d'activation, une fois la tâche 11 faite. |

### Lot A — Sécurité (code)

| Étape | Effort | Risque traité |
|---|---|---|
| A1. Analyse d'URL : adresse vérifiée figée (contre le rebinding DNS) et limite de 10 analyses par heure et par compte | S | Accès indirect au réseau interne du serveur (gravité moyenne). |
| A2. Réception des visites (`/api/collect`) : limite de débit et de taille dédiée dans Nginx, refus si le site n'est pas renseigné, quota mensuel par projet | S-M | Fausses visites injectées, disque du VPS rempli. |
| A3. Colonnes de `projects` modifiables seulement si nécessaire (droits par colonne) | S | Faux « script détecté » et reprise de la clé d'un ancien projet. |
| A4. Révocation de l'accès Stripe à la suppression d'un projet ou d'un compte, et prise en compte de « application déconnectée » | S | L'autorisation Stripe survit aujourd'hui à la suppression. |
| A5. Limite de tentatives de connexion par email et adresse IP réelle | M | Force brute, ou blocage de tout le monde (la limite actuelle voit l'adresse du conteneur). |
| A6. RGPD : purge automatique (visites, données Stripe des projets supprimés), durée de vie de l'identifiant visiteur, interrupteur « Anonymisation » réellement appliqué (il ne fait rien aujourd'hui), textes « emails chiffrés » corrigés (c'est une empreinte, pas un chiffrement) | M | Conformité, et interface aujourd'hui trompeuse. |
| A7. CSP avec nonce (sans `unsafe-inline`), double authentification pour le super administrateur | M | Vol de session en cas de faille XSS future. |
| A8. Actions GitHub épinglées par empreinte, second verrou sur le Stripe simulé, newsletter (double confirmation), sonde de santé moins bavarde, `docs/security.md` mis à jour | S | Chaîne de déploiement, petites fuites d'information. |

### Lot B — Exactitude et performance des chiffres

| Étape | Effort |
|---|---|
| B1. Churn ramené au mois, quelle que soit la période choisie (sur 12 mois, 58 % s'affiche aujourd'hui à côté des 7 % mensuels que l'utilisateur connaît) | S |
| B2. Revenu exact : remises et coupons, prix par paliers et à l'usage signalés « non estimés », multi-devises signalé, version de l'API Stripe figée | S-M |
| B3. Agrégation des visites en SQL et index, au lieu de JavaScript sur 50 000 lignes | M |
| B4. Import Stripe incrémental, reprise après un refus « trop de requêtes », notifications Stripe en temps réel | M |
| B5. Historique tiré des factures : débloque expansion, contraction, cohortes, valeur vie client et conversion essai → payant **dès le premier jour** | M-L |
| B6. Collecte : `replaceState` et `hashchange`, gclid et fbclid, meilleure classification (X, YouTube, ChatGPT, webmail), bon classement entre `www.` et `app.` | S |

---

## 5. Détail des analyses

### 5.1 État réel de chaque écran en production

| Écran | Calculé sur les vraies données | Pas encore réel |
|---|---|---|
| Accueil | Revenu mensuel récurrent, churn, revenu à risque, nouveau revenu, 3 clients à risque, visiteurs, canaux, pages d'entrée, analyse du site | Conversion essai → payant, 3 insights, graphique nouveau / expansion / perdu, aperçu du tunnel |
| Acquisition | Visiteurs, canaux, pages d'entrée, campagnes, sites d'origine | Inscrits, clients et revenu par canal |
| Tunnel | Rien | Tout |
| Churn | Churn clients et revenu, revenu à risque, paiements à récupérer, liste à risque (règles) | Cohortes, raisons de départ, chronologie client, email de relance |
| Revenus | Revenu mensuel récurrent sur 12 mois, nouveau, perdu, paiements échoués | Expansion, contraction, valeur vie client |
| Insights | Réglages d'alertes | Moteur d'insights |
| Barre de question, notifications | — | Aucun moteur, aucun email envoyé |

### 5.2 Sécurité : constats non encore corrigés

| Gravité | Constat | Qui corrige |
|---|---|---|
| ~~Élevée~~ | Emails non confirmés en production : **corrigé** (Resend + confirmation obligatoire, en ligne à la fusion de la PR n° 1) | Fait |
| Élevée | Accès Stripe en écriture, jamais révoqué | Moi (A4) + **vous** (clé restreinte) |
| Moyenne | Rebinding DNS sur l'analyse d'URL, sans limite | Moi (A1) |
| Moyenne | Limite de connexion inopérante (adresse du conteneur) | Moi (A5) |
| Moyenne | `/api/collect` polluable, sans quota | Moi (A2) |
| Moyenne | RGPD : pas de purge, identifiant sans durée, « anonymisation » sans effet | Moi (A6) + **juriste** |
| Moyenne | Déploiement équivalent à un accès administrateur du VPS partagé | Moi (épinglage) + **vous** (restriction de la clé SSH) |
| Faible | Colonnes de projet modifiables, newsletter, IPv6 dans la garde réseau, CSP, pas de double authentification, effacement de compte incomplet | Moi (A3, A7, A8) |

**Ce qui est bien fait** :
- RLS partout, fonctions protégées (`search_path` vide), clé de service utilisée seulement après contrôle ;
- OAuth Stripe à jeton anti-falsification, webhook signé et dédoublonné ;
- export CSV protégé contre les formules, pixels publicitaires validés et soumis au consentement ;
- ports internes fermés, HSTS, aucun secret dans Git, 0 vulnérabilité dans les dépendances.

### 5.3 Parcours actuel, compté

| Étape | Champs | Clics | Remarque |
|---|---|---|---|
| Site vitrine | 1 | 1 | — |
| Inscription | 3 | 1 | Google et GitHub actifs en production |
| Votre SaaS | 0 | 1 | Corrigé aujourd'hui (était 2 clics) |
| Script | 0 | 1, puis travail hors de l'app | Attente sans fin si rien n'arrive (D1) |
| Stripe | 0 | 1, plus 2 à 4 chez Stripe | Texte désormais cohérent |
| C'est terminé | 0 | 1 | Chiffres inventés retirés |
| Tableau de bord | — | — | 3 rappels de la même action (D3) |

---

## 6. Comment je procéderai pour chaque lot

1. Lire les fichiers concernés et écrire d'abord les tests du comportement attendu.
2. Faire les changements par petites étapes, avec la migration si besoin (appliquée seule au
   déploiement).
3. Vérifier : lint, types, tests unitaires, construction, tests de bout en bout (`npm run up`), et
   un passage à l'écran sur ordinateur et à 360 px.
4. Mettre à jour `CHANGELOG.md`, `PROJECT_STATE.md`, `docs/tech-debt.md` et ce fichier.
5. Vous montrer le résultat. Je ne commite et ne pousse que sur votre accord.
6. **Si un problème bloque** (compte, clé ou accès manquant) : je m'arrête, je l'ajoute à la
   section 3 avec la procédure exacte, et je continue sur le reste.
