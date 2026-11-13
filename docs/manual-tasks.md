| 12 | En production, créer votre compte **super administrateur**, dans votre session SSH : `sudo -u deploy bash /srv/saasclair/deploy/scripts/create-admin.sh <email> <prénom>` (mot de passe demandé au clavier, jamais affiché ni enregistré). Le compte `admin@demo.saasclair.fr` n’existe qu’en local | Après le 1er déploiement | Oui, pour administrer | ⬜ || 11 | **Emails d’authentification** (mot de passe oublié, confirmation) : créer un compte SMTP (Brevo, Resend, Postmark… ou l’email Hostinger) et reporter hôte, port, utilisateur et mot de passe dans `/srv/saasclair/.env` (`SMTP_*`), puis `deploy.sh --restart`. Les modèles de la marque sont déjà branchés. Ensuite seulement, activer la confirmation d’email (`GOTRUE_MAILER_AUTOCONFIRM: "false"` dans `deploy/compose.prod.yaml`) | Avant d’ouvrir les inscriptions au public | Oui, pour « mot de passe oublié » | ⬜ || 6 | **DNS de saasclair.com** chez Hostinger : 3 enregistrements `A` vers `69.62.116.243` (`@`, `www`, `api`) et suppression de l’ancien `A` vers `2.57.91.91`. Puis l’environnement GitHub `production` (secrets et variables listés dans `docs/deployment.md`, étape 5) | Incrément 9 | Oui, pour la mise en ligne | ⬜ || 5 | **Accès SSH par clé au VPS** : ajouter la clé publique `~/.ssh/saasclair_admin.pub` (créée sur votre poste) aux clés de `root`, en tapant vous-même le mot de passe root une dernière fois (procédure ci-dessous) | Incrément 9 | Oui, pour la mise en ligne | ⬜ |# Tâches manuelles (à faire par vous)

> Tout ce que Claude ne peut pas faire à votre place : comptes, clés, accès. Rien ici ne bloque
> le développement local, sauf mention contraire.

| # | Tâche | Quand | Bloquant ? | État |
|---|-------|-------|------------|------|
| 1 | Garder **Docker Desktop** lancé pendant le développement (`npm run up`) | Dès l'incrément 0 | Oui, pour lancer l'app | ⬜ |
| 2 | (Facultatif) Envoyer les logos en **SVG ou PNG haute définition** s'ils existent | Quand vous voulez | Non | ⬜ |
| 3 | Créer une **application OAuth Google** (procédure ci-dessous) | Quand vous voulez | Non (l'email fonctionne seul) | ✅ (actif en production, vérifié le 13/11/2026) |
| 4 | Créer une **application OAuth GitHub** (procédure ci-dessous) | Quand vous voulez | Non | ✅ (actif en production, vérifié le 13/11/2026) |
| 5 | Fournir le **VPS Hostinger** (plan, IP, accès SSH par clé) et le **nom de domaine** (et où sont gérés ses DNS) | Incrément 9 | Oui, pour la mise en ligne | ⬜ |
| 6 | Créer le **dépôt GitHub** et y enregistrer les secrets de déploiement | Incrément 9 | Oui, pour la mise en ligne | ⬜ |
| 7 | **Stripe Connect** (pour que vos clients connectent leur Stripe en un clic, en lecture seule) : procédure ci-dessous. Commencer en **mode test**, puis refaire en mode réel | Avant d’ouvrir les inscriptions | Oui, pour l’étape Stripe | ⬜ |
| 8 | Remplacer les **3 témoignages d'exemple** (base locale uniquement) par de vrais témoignages, depuis **Administration › Témoignages**, avec l'accord des personnes. Publier de faux avis est interdit (directive européenne « Omnibus ») | Avant la mise en ligne | Oui, pour la mise en ligne | ⬜ |
| 9 | **Politique de confidentialité** : page publiée sur https://saasclair.com/confidentialite (éditeur Kelenix Tech, responsable Lionel, contact lionelkelenix@gmail.com). À faire relire par un juriste ; ajouter l’adresse et le numéro d’immatriculation, puis une page de mentions légales | Avant l’ouverture au public | Non (page en ligne) | 🔄 |
| 10 | Saisir l'**email de contact** dans **Administration › Paramètres** (bouton « Nous contacter » de l'offre Pro, lien du pied de page) | Avant la mise en ligne | Non | ⬜ |
| 11 | **Emails d’authentification avec Resend** : valider `saasclair.com` dans Resend (région Ireland, enregistrements DNS ajoutés chez Hostinger), créer une clé « Sending access » limitée au domaine, puis dans `/srv/saasclair/.env` : `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587`, `SMTP_USER=resend`, `SMTP_PASS=<clé re_…>`, `SMTP_SENDER=no-reply@saasclair.com`, et `deploy.sh --restart`. Tester avec « mot de passe oublié ». Ensuite seulement, activer la confirmation d’email (`GOTRUE_MAILER_AUTOCONFIRM: "false"` dans `deploy/compose.prod.yaml`) | Avant d’ouvrir les inscriptions au public | Oui, pour « mot de passe oublié » | ✅ Resend configuré par vous ; confirmation d’email activée dans `deploy/compose.prod.yaml` (en ligne à la fusion de la PR n° 1) |
| 12 | En production, créer votre compte **super administrateur** depuis votre poste, avec les variables Supabase de production dans `.env` : `ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_FIRST_NAME=… npm run admin:create` (crée le compte, ou met à jour son mot de passe, puis vérifie la connexion). Le compte `admin@demo.saasclair.fr` n'existe qu'en local | Incrément 9 | Oui, pour administrer | ⬜ |
| 13 | (Facultatif) Coller vos identifiants **Google Ads** (ID et libellé de conversion « inscription »), **GA4**, **Meta** et **LinkedIn** dans **Administration › Paramètres** | Quand vous lancez des campagnes | Non | ⬜ |
| 14 | Compléter la **politique de confidentialité** avec les traceurs publicitaires utilisés (le bandeau de consentement est déjà en place) | Avant d'activer un pixel | Oui, pour la publicité | ⬜ |
| 15 | **Paiement des abonnements SaasClair** (Stripe Billing) : activer Stripe Tax, SEPA et PayPal dans votre compte Stripe, puis lancer l’installation (procédure ci-dessous) | Avant d’encaisser | Oui, pour le paiement | ⬜ |

## Procédure — accès SSH par clé (n° 5)

Dans PowerShell, sur votre poste (vous tapez le mot de passe root vous-même, une dernière fois) :

```powershell
type $env:USERPROFILE.sshsaasclair_admin.pub | ssh root@69.62.116.243 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Vérification : `ssh -i $env:USERPROFILE.sshsaasclair_admin root@69.62.116.243 hostname` répond
`srv1681209` sans demander de mot de passe. Variante sans terminal : hPanel › VPS › Paramètres ›
Clés SSH › Ajouter, en collant le contenu du fichier `.pub`. Rien d’autre ne change sur le serveur :
la connexion par mot de passe reste possible tant que vous ne la désactivez pas vous-même.

## Procédure — Stripe Connect (n° 7)

1. Dans votre compte Stripe, **Réglages › Connect** : activez Connect (vous êtes une « plateforme »).
2. **Connect › Réglages › Onboarding options › OAuth** : activez « OAuth for Standard accounts »,
   puis ajoutez l’URI de redirection `https://saasclair.com/api/stripe/callback`.
3. Notez l’**identifiant client** (`ca_…`, affiché sur cette même page) et votre **clé secrète**
   (Développeurs › Clés API, `sk_…`). En mode test, les deux existent aussi en version test.
4. Sur le serveur, dans `/srv/saasclair/.env`, ajoutez (ou complétez) vous-même :
   `STRIPE_SECRET_KEY=sk_…` et `STRIPE_CONNECT_CLIENT_ID=ca_…`, puis
   `sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --restart`.
5. Testez avec un compte Stripe de test : « Connecter Stripe » doit ouvrir la page de Stripe, puis
   revenir sur SaasClair avec l’import qui défile.

Ne communiquez jamais la clé secrète par message : elle ne va que dans ce fichier.

## Procédure — paiement des abonnements (n° 15)

Dans votre compte Stripe (le même que pour Connect), en **mode réel** :

1. **Taxes › Paramètres** : activez **Stripe Tax**, indiquez l’adresse de votre entreprise
   (origine) et ajoutez votre **immatriculation en France** (numéro de TVA). Stripe calcule
   ensuite la TVA selon le pays du client et applique l’autoliquidation entre entreprises de l’UE.
2. **Paramètres › Moyens de paiement** : activez **Prélèvement SEPA** et **PayPal** (la carte,
   Apple Pay et Google Pay sont déjà actifs).
3. **Paramètres › Facturation › Factures et reçus** : vérifiez la raison sociale, l’adresse et
   le numéro de TVA qui apparaîtront sur les factures (mentions légales, tâche n° 9).
4. Sur le serveur, lancez l’installation (produits, prix, notifications, portail) :
   `sudo -u deploy bash /srv/saasclair/deploy/scripts/billing-setup.sh`

   Elle crée aussi le **point de réception des comptes Stripe de vos clients** (Connect,
   `/api/stripe/webhook`) et enregistre son secret `STRIPE_CONNECT_WEBHOOK_SECRET` dans le `.env`.
   Déjà lancée avant le lot B ? **Relancez-la une fois** : elle ne recrée rien d’existant et
   n’ajoute que ce point. Pour vérifier : Stripe › Développeurs › Webhooks › un point
   « SaasClair — comptes Stripe des clients », avec l’option « Comptes connectés ».

Tant que Stripe Tax n’est pas activé, le paiement affiche « Le paiement en ligne n’est pas encore
ouvert ». Pour l’ouvrir sans TVA automatique en attendant, ajoutez
`BILLING_AUTOMATIC_TAX=false` au `.env` du serveur puis `deploy.sh --restart`.

## Procédure — connexion avec Google (n° 3)

**En production** (seules ces étapes comptent) :

1. [Google Cloud Console](https://console.cloud.google.com/) : créez un projet « SaasClair ».
2. **Google Auth Platform › Branding** : nom « SaasClair », email d’assistance, page d’accueil
   `https://saasclair.com`, lien vers la **politique de confidentialité** (`https://saasclair.com/confidentialite`),
   et dans **Domaines autorisés** : `saasclair.com`.
3. **Audience** : type « Externe », puis **Publier l’application** (« En production »). En mode
   « Test », seuls les comptes listés peuvent se connecter. Avec les seules informations de base
   (email, nom, photo), Google ne demande pas de vérification approfondie.
4. **Clients › Créer un client** : type « Application Web ». **URI de redirection autorisé** :
   `https://api.saasclair.com/auth/v1/callback`. Copiez l’identifiant client et le secret.
5. Sur le serveur, dans `/srv/saasclair/.env` (c’est vous qui collez les valeurs) :
   `GOOGLE_ENABLED=true`, `GOOGLE_CLIENT_ID=…`, `GOOGLE_SECRET=…`, puis
   `sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --restart`.
6. Testez « Continuer avec Google » sur https://saasclair.com/connexion.

**En local seulement** (poste de développement) : ajoutez aussi l’URI
`http://127.0.0.1:55321/auth/v1/callback` au client Google, copiez l’identifiant et le secret dans
`supabase/.env` (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `…_SECRET`), passez
`enabled = true` dans `supabase/config.toml` (`[auth.external.google]`), puis `npm run down` et
`npm run up`.

## Procédure — connexion avec GitHub (n° 4)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL : `http://localhost:3000` ; Authorization callback URL : `http://127.0.0.1:55321/auth/v1/callback`. En production, une seconde application OAuth avec `https://saasclair.com` et `https://api.saasclair.com/auth/v1/callback`, reportée dans `/srv/saasclair/.env` (`GITHUB_ENABLED=true`, `GITHUB_CLIENT_ID`, `GITHUB_SECRET`), puis `deploy.sh --restart`.
3. Générez un secret, puis copiez l'ID client et le secret dans `supabase/.env` (`SUPABASE_AUTH_EXTERNAL_GITHUB_…`).
4. Dans `supabase/config.toml`, section `[auth.external.github]`, passez `enabled = true`, puis `npm run down` et `npm run up`.

Tant que ces étapes ne sont pas faites, les boutons Google et GitHub affichent un message clair
(« arrive bientôt, utilisez votre email ») au lieu d'une erreur.
