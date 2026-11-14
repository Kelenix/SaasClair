# Ce que vous devez faire vous-même

> Mis à jour le 14 novembre 2026. Tout ce qui n'est pas dans la partie « À faire » est soit
> déjà fait, soit automatique. Une seule liste fait foi : celle-ci.

## En résumé

| | Combien | Temps |
|---|---|---|
| **À faire** avant d'ouvrir au public | 2 tâches | environ 7 min |
| **Facultatif**, quand vous voulez | 6 tâches | — |
| **Décisions** à me donner | aucune | — |
| **Déjà fait** | 23 tâches et décisions | rien à faire |

---

## 1. À faire avant d'ouvrir au public

### ⬜ 1. Sauvegardes hors du serveur (5 min)

Les sauvegardes de chaque nuit restent sur le même serveur : s'il est perdu, elles aussi.
Dans **hPanel › VPS › Instantanés et sauvegardes**, activez les sauvegardes automatiques de
Hostinger.

### ⬜ 2. Relier le bon compte Stripe à votre projet saasclair.com (2 min)

Votre projet lit le compte Stripe « Kelenix Tech », alors que vos abonnements SaasClair
arrivent sur l'autre compte, « Kelenix Teck ». C'est pour cela que Revenus, Churn et Insights
sont vides. Une fois la correction du 14 novembre en ligne :

1. Connectez-vous à SaasClair avec le compte qui porte le projet saasclair.com (celui qui a payé
   l'offre Starter).
2. Ouvrez **Paramètres › Projet**, ligne **Stripe**, et cliquez sur **« Changer de compte »**.
3. Dans la fenêtre Stripe, choisissez **« Kelenix Teck »**, puis autorisez.

En une minute, votre abonnement Starter apparaît dans Revenus et Churn. L'ancien compte
« Kelenix Tech » est détaché tout seul, et ses données sont effacées de SaasClair.

---

## 2. Facultatif, quand vous voulez

| Tâche | Où | Remarque |
|---|---|---|
| Ajouter de **vrais témoignages**, avec l'accord des personnes | Administration › Témoignages | La section reste cachée tant qu'il n'y en a pas. Jamais de faux avis (interdit). |
| Brancher la **publicité** (Google Ads, GA4, Meta, LinkedIn) | Administration › Paramètres | Ensuite, dites-le-moi : j'ajoute ces outils à la politique de confidentialité. |
| Mesurer la **vitesse sur mobile** | [PageSpeed Insights](https://pagespeed.web.dev) avec `https://saasclair.com` | Envoyez-moi le score si une note est en orange ou en rouge. |
| Ne pas compter **vos propres visites** dans vos chiffres | Sur chaque navigateur que vous utilisez (ordinateur, téléphone) : ouvrez `saasclair.com/confidentialite`, puis cliquez sur « Ne plus compter mes visites » | 1 clic par navigateur. Sinon, vos passages quotidiens sur le site et le tableau de bord gonflent vos visites. |
| M'envoyer les **logos en SVG** s'ils existent | Dans la conversation | Ils seraient plus nets sur les grands écrans. |
| Compléter les **mentions légales** : adresse du siège et numéro SIREN | Dans la conversation | Laissés vides à votre demande. La loi les demande pour une activité commerciale : envoyez-les-moi dès que vous les avez, je les ajoute. |

---

## 3. Décisions à me donner

Aucune décision en attente : les 4 questions ont reçu votre réponse le 14 novembre (voir
« Déjà fait »).

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
| Paiement des abonnements | ✅ Testé par vous le 14 novembre : fonctionne. Stripe vérifié (compte actif, 6 prix justes, taxes) ; carte, Apple Pay, Google Pay et Link ; SEPA et PayPal laissés désactivés à votre demande |
| Installation de la facturation dans Stripe (`billing-setup.sh`) | ✅ Lancée par vous, notifications en temps réel actives |
| Compte super administrateur en production | ✅ Créé, double authentification reliée |
| Email de contact (bouton « Nous contacter », pied de page) | ✅ En place sur le site |
| Politique de confidentialité | ✅ En ligne, relue et validée par vous le 14 novembre |
| Mentions légales | ✅ En ligne sur `saasclair.com/mentions-legales` (éditeur Kelenix Tech, directeur de la publication Lionel, hébergeur Hostinger), lien dans le pied de page |
| Mesure de saasclair.com avec SaasClair | ✅ Ligne installée le 14 novembre sur tout le site (clé `6eead66e`) : vos visites, leur provenance et vos inscrits par canal arrivent dans votre propre tableau de bord. Politique de confidentialité complétée (mesure sans cookie, bouton « Ne plus compter mes visites ») |
| Recommandation « Ajoutez un lien Tarifs dans le menu » | ✅ Fausse alerte, corrigée le 14 novembre : votre menu a déjà ce lien (vers la section Tarifs de l'accueil). Rien à faire : elle disparaît seule à la prochaine analyse de votre site (6 heures au plus) |
| Tunnel « Vos tarifs freinent le passage à l'inscription » (2 visiteurs) | ✅ Conclusion trop hâtive, corrigée le 14 novembre : l'étape à corriger n'est désignée qu'à partir de 20 visiteurs, sinon « Encore trop tôt pour conclure ». Les tarifs ne sont plus accusés quand vos visiteurs ne sont pas passés par une page de tarifs. Rien à faire |
| Durées de conservation | ✅ Validées avec la politique : visites 25 mois, identifiant du visiteur 13 mois |
| Décision : écrans vides | ✅ Un dessin de l'écran, étiqueté « À quoi ressemblera cet écran », sans aucun chiffre |
| Décision : début de l'essai de 7 jours | ✅ À la création du compte (clic sur « Essai gratuit ») : c'était déjà le cas, rien à changer |
| Décision : relier les inscrits à leur visite | ✅ Automatique : le script envoie l'empreinte de l'email saisi dans le formulaire d'inscription (coupable avec `data-identify="off"`) ; inscrits par canal dans Acquisition |
| Décision : même visiteur sur `www.` et `app.` | ✅ Sans cookie : l'identifiant suit le visiteur dans les liens d'un sous-domaine à l'autre |
| Décision : intégrations (Google Analytics, Search Console, HubSpot, Pipedrive) | ✅ Affichées « Bientôt » dans Paramètres › Intégrations, sans faux bouton ; à construire si vos clients les demandent |
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
