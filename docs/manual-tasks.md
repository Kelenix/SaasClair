# Ce que vous devez faire vous-même

> Mis à jour le 14 novembre 2026. Tout ce qui n'est pas dans la partie « À faire » est soit
> déjà fait, soit automatique. Une seule liste fait foi : celle-ci.

## En résumé

| | Combien | Temps |
|---|---|---|
| **À faire** avant d'ouvrir au public | 4 tâches | environ 45 min, plus le juriste |
| **Facultatif**, quand vous voulez | 4 tâches | — |
| **Décisions** à me donner | 5 questions | une réponse courte chacune |
| **Déjà fait** | 12 tâches | rien à faire |

---

## 1. À faire avant d'ouvrir au public

### ⬜ 1. Vérifier que le paiement des abonnements est ouvert (5 à 20 min)

**Comment savoir si c'est déjà bon** : connectez-vous à SaasClair avec un compte de test, allez
dans Paramètres › Abonnement et choisissez une offre.
- La page de paiement Stripe s'ouvre : **c'est bon**, rien à faire.
- Vous voyez « Le paiement en ligne n'est pas encore ouvert » : faites les 3 étapes ci-dessous.

Dans votre compte Stripe, en **mode réel** :
1. **Taxes › Paramètres** : activez **Stripe Tax**, indiquez l'adresse de votre entreprise et
   votre numéro de TVA.
2. **Paramètres › Moyens de paiement** : activez **Prélèvement SEPA** et **PayPal**.
3. **Paramètres › Facturation › Factures et reçus** : vérifiez la raison sociale, l'adresse et
   le numéro de TVA imprimés sur les factures.

Rien à faire sur le serveur : l'installation (`billing-setup.sh`) est déjà faite.

### ⬜ 2. Mentions légales : m'envoyer vos informations (10 min)

La page est **obligatoire** pour un site commercial, et elle n'existe pas encore
(`saasclair.com/mentions-legales` donne une erreur). Envoyez-moi dans la conversation :
- votre nom ou raison sociale, et la forme juridique (micro-entreprise, SAS…) ;
- l'adresse du siège ;
- le numéro SIREN (ou RCS) et le numéro de TVA ;
- le nom du directeur de la publication (vous, en général) ;
- un email ou un téléphone de contact.

Je crée la page, je complète l'hébergeur (Hostinger) et je l'ajoute au pied de page.

### ⬜ 3. Faire relire la politique de confidentialité par un juriste

La page est en ligne : `saasclair.com/confidentialite`. Points à lui faire valider :
- visites gardées **25 mois**, identifiant du visiteur **13 mois** ;
- emails des inscrits réduits à une **empreinte** (SHA-256), jamais en clair ;
- données Stripe de vos clients effacées à la suppression du compte ou à la déconnexion de Stripe.

### ⬜ 4. Sauvegardes hors du serveur (5 min)

Les sauvegardes de chaque nuit restent sur le même serveur : s'il est perdu, elles aussi.
Dans **hPanel › VPS › Instantanés et sauvegardes**, activez les sauvegardes automatiques de
Hostinger.

---

## 2. Facultatif, quand vous voulez

| Tâche | Où | Remarque |
|---|---|---|
| Ajouter de **vrais témoignages**, avec l'accord des personnes | Administration › Témoignages | La section reste cachée tant qu'il n'y en a pas. Jamais de faux avis (interdit). |
| Brancher la **publicité** (Google Ads, GA4, Meta, LinkedIn) | Administration › Paramètres | Ensuite, dites-le-moi : j'ajoute ces outils à la politique de confidentialité. |
| Mesurer la **vitesse sur mobile** | [PageSpeed Insights](https://pagespeed.web.dev) avec `https://saasclair.com` | Envoyez-moi le score si une note est en orange ou en rouge. |
| M'envoyer les **logos en SVG** s'ils existent | Dans la conversation | Ils seraient plus nets sur les grands écrans. |

---

## 3. Décisions à me donner (une réponse courte suffit)

1. **Écrans vides** : afficher un dessin clairement étiqueté « À quoi ressemblera cet écran »
   au lieu de « Pas encore de données » ? (Aucun faux chiffre : c'est un dessin.)
2. **Essai de 7 jours** : le faire démarrer à l'arrivée des premières visites, plutôt qu'à la
   création du compte ? Aujourd'hui, si l'installation prend 3 jours, il ne reste que 4 jours.
3. **Durées de conservation** : garder 25 mois pour les visites et 13 mois pour l'identifiant
   du visiteur (recommandation de la CNIL) ? À confirmer avec le juriste (tâche 3).
4. **Relier automatiquement les inscrits à leurs visites** : le script lirait l'email saisi sur
   la page d'inscription et n'en enverrait que l'empreinte. Cela débloque « inscrits par canal »
   et le tunnel jusqu'au paiement sans aucune ligne à ajouter. Donnée personnelle
   (pseudonymisée) : à valider avec le juriste.
5. **Même visiteur sur `www.` et `app.`** : partager l'identifiant entre vos sous-domaines
   demande un cookie (13 mois au plus), alors que le script promet « sans cookie ». À décider
   avec la question 4.

---

## 4. Déjà fait ✅ (rien à faire)

| Quoi | État |
|---|---|
| Serveur Hostinger, nom de domaine, accès SSH par clé | ✅ Site en ligne sur saasclair.com |
| Dépôt GitHub et déploiement automatique | ✅ Chaque correction fusionnée est mise en ligne seule |
| Connexion avec Google | ✅ Active, vérifiée le 13 novembre |
| Connexion avec GitHub | ✅ Active, vérifiée le 13 novembre |
| Emails (Resend) : confirmation, mot de passe oublié, lien de connexion | ✅ Configuré par vous (les alertes passent aussi par lui : premier envoi à confirmer) |
| Stripe Connect : vos clients relient leur Stripe | ✅ Clés en place sur le serveur |
| Installation de la facturation dans Stripe (`billing-setup.sh`) | ✅ Lancée par vous, notifications en temps réel actives |
| Compte super administrateur en production | ✅ Créé, double authentification reliée |
| Email de contact (bouton « Nous contacter », pied de page) | ✅ En place sur le site |
| Politique de confidentialité publiée | ✅ En ligne (relecture par un juriste : tâche 3) |
| Surveillance du site (UptimeRobot) | ✅ Toutes les 5 minutes sur `saasclair.com/api/health?complet=1` (site, connexion et base), alerte par email ; réglée le 14 novembre |
| Docker Desktop pour le développement local | ✅ Utile seulement si vous développez sur votre poste |

---

## 5. En cas de besoin

**Téléphone perdu (double authentification de l'administration)** : dans votre session SSH,
```
sudo -u deploy bash /srv/saasclair/deploy/scripts/reset-admin-2fa.sh <votre email>
```
À la connexion suivante à `/admin`, vous reliez une nouvelle application (QR code).

**Changer un réglage du serveur** (clé, email, Google…) : modifiez `/srv/saasclair/.env`,
puis
```
sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --restart
```
Ne m'envoyez jamais une clé secrète par message : elle ne va que dans ce fichier.

**Ouvrir le paiement sans TVA automatique**, en attendant Stripe Tax : ajoutez
`BILLING_AUTOMATIC_TAX=false` au `.env` du serveur, puis la commande ci-dessus.

---

## 6. Pour information : ce que je ferai, pas vous

Deux renforcements de sécurité demandent d'abord un changement de ma part. Je vous dirai
exactement quoi faire ensuite :
- **Restreindre la clé de déploiement** du serveur : il faut d'abord changer la façon dont les
  fichiers arrivent sur le serveur (aujourd'hui copiés, puis un script est lancé).
- **Clé Stripe en lecture seule** pour l'import des données de vos clients : il faut d'abord
  séparer cette clé de celle de la facturation dans le code.
