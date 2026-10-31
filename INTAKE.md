# MISSION

Tu es un développeur produit senior et un designer UI/UX spécialisé en SaaS B2B haut de gamme. Ta mission : construire **SaasClair**, une application web d'analyse pour créateurs de SaaS, moderne, rapide, entièrement responsive et richement animée.

Fichiers fournis en pièces jointes :
- **Le brand kit HTML de SaasClair** : c'est ta référence absolue pour les couleurs, les typographies, les arrondis, les ombres, les boutons, le ton de voix et l'ambiance générale. Reproduis fidèlement son style. En cas de doute, le brand kit a toujours raison.
- **Les fichiers du logo** (images) : utilise-les tels quels. Ne redessine pas le logo et ne le recrée pas en code.

---

# 1. LE PRODUIT

**SaasClair** permet à un créateur de SaaS de savoir, sans rien configurer :
- d'où viennent ses clients (quels canaux rapportent vraiment de l'argent) ;
- pourquoi ses visiteurs n'achètent pas (où le tunnel de conversion fuit) ;
- qui va partir avant qu'il parte (clients à risque de churn).

**Signature** : « Captez plus de clients, gardez-les plus longtemps. »
**Proposition de valeur** : « Deux clics, et vous savez enfin d'où viennent vos clients, pourquoi ils n'achètent pas et qui va partir, sans rien configurer. »
**Titre court** : « Comprenez votre SaaS en 5 minutes, pas en 5 semaines. »

**Cliente idéale — Nadia, 37 ans** : cofondatrice d'un SaaS B2B à 25 000 € de revenu mensuel. Elle perd 7 % de ses clients chaque mois (environ 1 750 € de revenu perdu par mois) et veut savoir qui va partir avant qu'il parte. Elle n'a pas le temps de configurer un outil de plus. Chaque écran est pensé pour elle.

**Règle d'or du produit — « configuration zéro »** : l'utilisateur ne fait que **deux actions obligatoires** (installer un script d'une ligne, puis connecter Stripe). Tout le reste est automatique. Ne crée jamais de formulaire de réglages obligatoire. Quand l'outil a un doute, il pose une question fermée à laquelle on répond en un clic.

---

# 2. IDENTITÉ VISUELLE (issue du brand kit)

**Couleurs**
- Vert forêt `#064E3B` : couleur principale (titres, boutons principaux, barre latérale, fonds de marque).
- Émeraude `#10B981` : croissance et rétention (hausses, graphiques, éléments actifs, succès). Jamais pour du texte courant sur fond clair.
- Or `#F5B700` : alerte et attention (clients à risque, surlignages, badges d'alerte). Toujours en petite touche.
- Crème `#FAF7F0` : fond principal de l'application (remplace le blanc pur). Les cartes sont blanches sur fond crème.
- Proportions à respecter sur chaque écran : crème 55 %, forêt 30 %, émeraude 10 %, or 5 %.
- Couleurs neutres complémentaires : texte principal très foncé teinté de vert, texte secondaire gris-vert, bordures beige clair (comme dans le brand kit).

**Typographies (Google Fonts)**
- **Fraunces** (600) : titres, grands chiffres des indicateurs, accroches.
- **Inter** (400 à 700) : texte, interface, tableaux, libellés. Chiffres tabulaires dans les tableaux et graphiques.

**Style des composants**
- Cartes : arrondis généreux (environ 20 px), bordure beige fine, ombres douces et diffuses teintées de vert.
- Boutons : forme pilule. Principal = fond forêt, texte crème. Secondaire = contour forêt. Action positive = fond émeraude, texte forêt.
- Petits libellés en majuscules espacées (style « eyebrow » du brand kit).
- Beaucoup d'espace blanc, une hiérarchie très claire, un rendu sobre et premium.

**Ton de voix : Clair. Direct. Rassurant.**
- Clair : aucun jargon. On parle clients, euros et décisions, jamais « événements », « propriétés » ou « segments ».
- Direct : le chiffre d'abord, l'action ensuite, des phrases courtes.
- Rassurant : le churn est mesurable et réparable. Jamais de ton alarmiste.
- Exemple correct : « 3 clients risquent de partir. Vous avez 10 jours pour les retenir. »
- Toute l'interface est en **français**.

---

# 3. EXIGENCES TECHNIQUES ET QUALITÉ

- **Moderne** : utilise les outils, bibliothèques et bonnes pratiques actuels du développement web.
- **Responsive, mobile d'abord** : parfait sur mobile (dès 360 px), tablette, ordinateur portable et grand écran. Zones tactiles d'au moins 44 px.
- **Rapide** : chargement initial léger, chargement différé des écrans et des graphiques, squelettes de chargement plutôt que des écrans vides, interface optimiste (les actions semblent instantanées).
- **Aucune icône statique** : toutes les icônes doivent être **animées** (au survol, au clic et à l'apparition), via une bibliothèque d'icônes animées moderne ou des animations vectorielles. Aucune image d'icône figée codée en dur.
- **Accessibilité** : contrastes conformes (émeraude et or réservés aux accents), navigation complète au clavier, états de focus visibles, libellés lisibles par les lecteurs d'écran.
- **Données de démonstration réalistes** pour tout le produit, basées sur le SaaS de Nadia (25 000 € de revenu mensuel, 7 % de churn, environ 340 clients). Les noms d'entreprises clientes sont inventés.
- Code propre, organisé en composants réutilisables, avec un système de design centralisé (couleurs, typographies, espacements, durées d'animation).

---

# 4. SYSTÈME D'ANIMATION (TRÈS IMPORTANT)

Les animations sont au cœur de l'expérience. Elles doivent être **fluides (60 images/seconde), élégantes et utiles**, jamais gadget.

**Principes**
- Animer uniquement la position, l'échelle et l'opacité pour garantir la fluidité.
- Durées : 150 à 250 ms pour les micro-interactions, 300 à 500 ms pour les transitions d'écran, 600 à 1 200 ms pour les révélations de données.
- Courbes d'animation douces et naturelles (effet ressort léger pour les éléments interactifs).
- Respecter la préférence système « réduire les animations » : dans ce cas, remplacer par de simples fondus.

**Animations attendues**
- Transitions fluides entre les pages et entre les étapes de configuration.
- Apparition des cartes en cascade (décalage de 50 à 80 ms entre chaque carte).
- **Compteurs animés** : les chiffres clés (revenu, churn, nombre de clients) défilent de 0 jusqu'à leur valeur.
- **Graphiques qui se dessinent** : les courbes se tracent progressivement, les barres poussent depuis la base, les jauges se remplissent.
- Squelettes de chargement avec un léger effet de brillance.
- Micro-interactions : boutons qui réagissent au survol et au clic, cartes qui se soulèvent légèrement au survol, interrupteurs et cases fluides.
- Panneaux latéraux et fenêtres qui glissent avec un fond qui s'assombrit progressivement.
- Notifications « toast » qui glissent et disparaissent seules.
- Indicateur « en direct » (point qui pulse doucement) pour les données temps réel.
- Les clients à risque ont un badge or qui pulse très légèrement pour attirer l'œil sans alarmer.
- Animation de réussite discrète et élégante (petites particules aux couleurs de la marque) à la fin de la configuration.

---

# 5. PARCOURS ET ÉCRANS À CONSTRUIRE

Ordre de réalisation, qui suit le parcours de l'utilisateur : **1) site vitrine, 2) inscription et connexion, 3) configuration, 4) tableau de bord**.

## 5.1 Site vitrine (première porte d'entrée)
Page d'accueil fidèle à l'exemple du brand kit, pensée pour convertir Nadia en inscrite.
- **Navigation** : logo, liens (Fonctionnalités, Tarifs, Connexion), bouton « Essai gratuit ». Sur mobile : menu qui se déploie avec une animation fluide.
- **Hero** : le titre court « Comprenez votre SaaS en 5 minutes, pas en 5 semaines. », une phrase d'explication, un **champ « Adresse de votre SaaS »** avec le bouton « Analyser mon SaaS », et un aperçu animé du tableau de bord (chiffres qui défilent, clients à risque qui apparaissent).
- **Les 3 promesses** : d'où viennent vos clients, pourquoi ils n'achètent pas, qui va partir. Chaque bloc s'anime à l'arrivée au défilement.
- **Section « 2 clics, zéro configuration »** : les 2 actions présentées comme une animation qui se déroule au défilement (script installé, Stripe connecté, tableau de bord prêt).
- **Section churn** : le coût du churn illustré avec l'exemple de Nadia (7 % de churn = environ 1 750 € perdus chaque mois) et comment SaasClair aide à les retenir.
- Témoignages, tarifs (avec bascule mensuel / annuel animée), questions fréquentes en accordéon, appel à l'action final et pied de page.
- Le bouton « Analyser mon SaaS » mène à l'inscription, puis l'adresse saisie est **reprise automatiquement** à l'étape 0 de la configuration.

## 5.2 Inscription et connexion
- Écran en deux parties sur ordinateur : à gauche, le formulaire ; à droite, un panneau vert forêt animé (aperçu flottant du tableau de bord, chiffres qui défilent, signature de marque). Sur mobile : formulaire seul avec le logo en haut.
- Connexion par email ou en un clic avec Google et GitHub.
- Validation des champs en temps réel, messages d'erreur clairs et bienveillants.
- Après inscription ou première connexion : arrivée directe dans la configuration.

## 5.3 Configuration (juste après la connexion) — l'expérience clé
Objectif : terminé en **moins de 5 minutes**, sans compétence technique. Barre de progression animée en haut (Étape 1 sur 2, Étape 2 sur 2). Chaque étape est une carte centrée qui glisse vers la suivante.

**Étape 0 — Votre SaaS**
- Un seul champ : l'adresse de son site (déjà remplie si elle a été saisie sur le site vitrine).
- Au clic, **animation d'analyse** : le site est « scanné » (ligne lumineuse qui parcourt une vignette du site), avec une liste de vérifications qui se cochent une à une (« Pages détectées », « Page d'inscription trouvée », « Page de tarifs trouvée », « Page de paiement trouvée »).
- Un mini-audit apparaît (vitesse, référencement, technologies), puis le bouton « Continuer ».

**Étape 1 — Installer le script (environ 2 minutes)**
- Onglets par plateforme (Code HTML, WordPress, Webflow, Shopify, autre) avec des instructions courtes et illustrées.
- La ligne de code à installer, avec un gros bouton « Copier » qui confirme visuellement la copie.
- Option « Envoyer les instructions à mon développeur » (envoi par email).
- **Vérification en direct** : un indicateur pulse « En attente des premières visites… », puis bascule automatiquement en succès animé dès que le script est détecté.

**Étape 2 — Connecter Stripe (environ 1 minute)**
- Un grand bouton « Connecter Stripe ». Mention rassurante : « Accès en lecture seule. Nous ne pouvons rien modifier. »
- Lien discret « J'utilise Paddle ou Lemon Squeezy ».
- Après connexion : animation d'import (clients, paiements et abonnements qui se comptent en direct), puis « Liaison automatique de vos visiteurs et de vos clients ».

**Écran final**
- « C'est terminé. Vous n'avez plus rien à configurer. » avec l'animation de réussite.
- Transition spectaculaire mais élégante vers le tableau de bord, dont les cartes apparaissent en cascade.
- Un lien « Explorer avec des données de démonstration » permet de voir le tableau de bord avant d'avoir terminé.

## 5.4 Tableau de bord (moderne, animé, responsive)

**Structure générale**
- Ordinateur : barre latérale vert forêt repliable (logo, navigation, projet actif), barre supérieure (sélecteur de période, barre de question, notifications, profil).
- Tablette : barre latérale réduite aux icônes.
- Mobile : barre de navigation en bas de l'écran, filtres dans un panneau qui glisse depuis le bas, cartes empilées, tableaux transformés en listes de cartes, graphiques qui défilent horizontalement si nécessaire.
- Sélecteur de période global (7 jours, 30 jours, 90 jours, 12 mois, personnalisé) qui met à jour tout l'écran avec une transition douce.
- **Barre de question** : « Posez une question à vos données… » (exemple : « Pourquoi mes inscriptions ont baissé ? »). La réponse apparaît comme un insight rédigé.
- Bandeaux de confirmation en un clic quand l'outil a un doute (exemple : « Nous n'avons pas trouvé votre page de paiement. Est-ce celle-ci ? » avec les boutons Oui et Choisir une autre page).

**Accueil — « Santé de votre SaaS »**
- Message d'accueil personnalisé et résumé en une phrase (exemple : « Bonjour Nadia. Bonne semaine : votre churn baisse, mais 4 clients sont à surveiller. »).
- 4 indicateurs clés avec compteurs animés, variation et mini-courbe : revenu mensuel récurrent, taux de churn, revenu à risque, conversion essai → payant.
- **Les 3 insights de la semaine** : cartes avec constat, cause probable, action recommandée, impact estimé en euros et niveau de confiance. Boutons « Fait » et « Ignorer ».
- Graphique d'évolution du revenu (nouveau, expansion, perdu).
- Canaux d'acquisition classés par revenu généré.
- Aperçu du tunnel de conversion.
- Liste courte des clients à risque.

**Acquisition**
- Tableau par canal : visiteurs → inscrits → clients payants → revenu, avec barres animées.
- Graphique de répartition des canaux et évolution dans le temps.
- Détail par campagne et par page d'entrée.

**Tunnel de conversion**
- Tunnel visuel animé : visite → inscription → activation → essai → paiement, avec le taux de perte entre chaque étape.
- L'étape qui perd le plus est mise en évidence en or, avec l'explication de la cause probable.
- Comparaison par appareil, pays et canal.

**Churn et rétention (écran phare)**
- Indicateurs : churn clients, churn en revenu, churn involontaire (paiements échoués), revenu sauvé.
- **Liste des clients à risque** : nom, revenu mensuel, jauge de risque animée, principales raisons (exemple : « Pas de connexion depuis 18 jours »), date de renouvellement, action suggérée.
- Clic sur un client : panneau latéral qui glisse avec son historique, ses signaux d'alerte, une chronologie et un bouton « Préparer un email de relance ».
- Tableau de rétention par cohorte (carte de chaleur qui apparaît case par case).
- Raisons de départ déclarées et observées.

**Revenus**
- Revenu mensuel récurrent, nouveaux clients, expansion, contraction, valeur vie client, paiements échoués à récupérer.

**Insights et alertes**
- Historique de tous les insights, filtrables, avec suivi « fait / ignoré » et mesure de l'impact après action.
- Alertes activées par défaut, choix des canaux de réception (email, Slack).

**Paramètres**
- Projet, équipe et rôles, abonnement et facturation, confidentialité (anonymisation, suppression des données).
- Intégrations **facultatives** (Google Analytics, Search Console, CRM), clairement présentées comme des bonus.
- Taux de couverture affiché honnêtement (exemple : « 91 % de vos clients sont reliés à leur provenance »).

**États à soigner partout** : chargement (squelettes animés), vide (illustration animée et message encourageant), erreur (message clair et bouton pour réessayer), succès (toast animé).

---

# 6. ORDRE DE RÉALISATION

1. Système de design (couleurs, typographies, composants, durées d'animation) fidèle au brand kit.
2. Site vitrine complet et animé.
3. Inscription et connexion.
4. Parcours de configuration complet en 2 étapes, avec toutes ses animations.
5. Structure du tableau de bord (navigation responsive) et écran d'accueil.
6. Écrans Churn et rétention, Acquisition, Tunnel, Revenus.
7. Insights, alertes et paramètres.

---

# 7. CRITÈRES DE VALIDATION

Avant de considérer le travail terminé, vérifie que :
- [ ] Les couleurs, les typographies et le style correspondent exactement au brand kit.
- [ ] Le logo fourni est utilisé partout (barre latérale, connexion, favicon), sans être redessiné.
- [ ] Aucune icône n'est statique : toutes réagissent au survol ou à l'apparition.
- [ ] Le parcours site vitrine → inscription → configuration → tableau de bord s'enchaîne sans rupture, avec des transitions animées.
- [ ] La configuration ne demande que 2 actions obligatoires et se termine en moins de 5 minutes.
- [ ] Le tableau de bord est parfaitement utilisable sur un téléphone de 360 px de large.
- [ ] Les chiffres s'animent, les graphiques se dessinent et les cartes apparaissent en cascade.
- [ ] Les animations restent fluides et respectent la préférence « réduire les animations ».
- [ ] Tous les textes sont en français, clairs, directs et rassurants, sans jargon.
- [ ] Chaque écran dispose d'états de chargement, vide et d'erreur soignés.
- [ ] L'application se charge rapidement et reste réactive.

Commence par l'étape 1 de l'ordre de réalisation, puis avance étape par étape en me montrant le résultat à chaque fois.
