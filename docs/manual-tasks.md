# Tâches manuelles (à faire par vous)

> Tout ce que Claude ne peut pas faire à votre place : comptes, clés, accès. Rien ici ne bloque
> le développement local, sauf mention contraire.

| # | Tâche | Quand | Bloquant ? | État |
|---|-------|-------|------------|------|
| 1 | Garder **Docker Desktop** lancé pendant le développement (`npm run up`) | Dès l'incrément 0 | Oui, pour lancer l'app | ⬜ |
| 2 | (Facultatif) Envoyer les logos en **SVG ou PNG haute définition** s'ils existent | Quand vous voulez | Non | ⬜ |
| 3 | Créer une **application OAuth Google** (procédure ci-dessous) | Quand vous voulez | Non (l'email fonctionne seul) | ⬜ |
| 4 | Créer une **application OAuth GitHub** (procédure ci-dessous) | Quand vous voulez | Non | ⬜ |
| 5 | Fournir le **VPS Hostinger** (plan, IP, accès SSH par clé) et le **nom de domaine** (et où sont gérés ses DNS) | Incrément 9 | Oui, pour la mise en ligne | ⬜ |
| 6 | Créer le **dépôt GitHub** et y enregistrer les secrets de déploiement | Incrément 9 | Oui, pour la mise en ligne | ⬜ |
| 7 | (Plus tard) Compte **Stripe Connect** pour la vraie connexion Stripe en lecture seule | Phase « collecte réelle » | Non | ⬜ |
| 8 | Remplacer les **3 témoignages d'exemple** (base locale uniquement) par de vrais témoignages, depuis **Administration › Témoignages**, avec l'accord des personnes. Publier de faux avis est interdit (directive européenne « Omnibus ») | Avant la mise en ligne | Oui, pour la mise en ligne | ⬜ |
| 9 | Fournir les **informations légales** (raison sociale, SIREN, adresse, hébergeur, contact données personnelles) pour rédiger les mentions légales et la politique de confidentialité, puis les faire valider par un juriste | Avant la mise en ligne | Oui, pour la mise en ligne | ⬜ |
| 10 | Saisir l'**email de contact** dans **Administration › Paramètres** (bouton « Nous contacter » de l'offre Pro, lien du pied de page) | Avant la mise en ligne | Non | ⬜ |
| 11 | En production, dans Supabase : **activer la confirmation d'email**, coller les **2 modèles d'email** (`supabase/templates/`) et ajouter l'URL du site dans les adresses de redirection autorisées | Incrément 9 | Oui, pour la mise en ligne | ⬜ |
| 12 | En production, créer votre compte **super administrateur** depuis votre poste, avec les variables Supabase de production dans `.env` : `ADMIN_EMAIL=… ADMIN_PASSWORD=… ADMIN_FIRST_NAME=… npm run admin:create` (crée le compte, ou met à jour son mot de passe, puis vérifie la connexion). Le compte `admin@demo.saasclair.fr` n'existe qu'en local | Incrément 9 | Oui, pour administrer | ⬜ |
| 13 | (Facultatif) Coller vos identifiants **Google Ads** (ID et libellé de conversion « inscription »), **GA4**, **Meta** et **LinkedIn** dans **Administration › Paramètres** | Quand vous lancez des campagnes | Non | ⬜ |
| 14 | Compléter la **politique de confidentialité** avec les traceurs publicitaires utilisés (le bandeau de consentement est déjà en place) | Avant d'activer un pixel | Oui, pour la publicité | ⬜ |

## Procédure — connexion avec Google (n° 3)

1. [Google Cloud Console](https://console.cloud.google.com/) → créez un projet « SaasClair ».
2. **API et services → Écran de consentement OAuth** : type « Externe », nom « SaasClair », votre email.
3. **Identifiants → Créer des identifiants → ID client OAuth** → « Application Web ».
4. **URI de redirection autorisés** : `http://127.0.0.1:55321/auth/v1/callback` (local). En production,
   ajoutez celui de votre projet Supabase : `https://<ref>.supabase.co/auth/v1/callback`.
5. Copiez l'ID client et le secret dans `supabase/.env` (`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` et `…_SECRET`).
6. Dans `supabase/config.toml`, section `[auth.external.google]`, passez `enabled = true`, puis `npm run down` et `npm run up`.

## Procédure — connexion avec GitHub (n° 4)

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL : `http://localhost:3000` ; Authorization callback URL : `http://127.0.0.1:55321/auth/v1/callback`.
3. Générez un secret, puis copiez l'ID client et le secret dans `supabase/.env` (`SUPABASE_AUTH_EXTERNAL_GITHUB_…`).
4. Dans `supabase/config.toml`, section `[auth.external.github]`, passez `enabled = true`, puis `npm run down` et `npm run up`.

Tant que ces étapes ne sont pas faites, les boutons Google et GitHub affichent un message clair
(« arrive bientôt, utilisez votre email ») au lieu d'une erreur.
