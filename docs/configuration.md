# Configuration des clés et des accès

> Pour chaque réglage : à quoi il sert, où l'obtenir, où le coller, comment vérifier, quand le
> changer. **Aucun secret réel n'est écrit ici.** Les fichiers `.env` ne vont jamais dans Git.

## 1. Fichier `.env` (racine du projet, et sur le VPS)

Modèle : `.env.example`.

| Variable | À quoi elle sert | Où l'obtenir | Secret ? |
|----------|------------------|--------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Adresse de la base et de l'authentification | Supabase › Project Settings › API › Project URL (local : `npx supabase status`) | Non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, limitée par la RLS | Même page, « anon public » | Non (publique par conception) |
| `SUPABASE_SERVICE_ROLE_KEY` | Suppression de comptes et création d'administrateurs, **côté serveur seulement** | Même page, « service_role » | **Oui** : ne jamais la partager ni l'exposer au navigateur |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique du site (liens, plan du site, emails) | Votre domaine, ex. `https://saasclair.fr` | Non |
| `DEMO_DATA` | Données d’exemple du tableau de bord (le SaaS de Nadia), pour le développement et les tests | `true` en local et en CI ; **absente en production** (tout reste vide tant que l’utilisateur n’a pas de données) | Non |

**Vérifier** : `curl https://votre-domaine/api/health?complet=1` doit renvoyer `"status":"ok"`.
**Changer** : la clé de service chaque trimestre ou au moindre doute (runbook n° 7).

## 2. Fichier `supabase/.env` (connexion Google et GitHub, local)

| Variable | Où l'obtenir |
|----------|--------------|
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` | Google Cloud Console › API et services › Identifiants (procédure : `docs/manual-tasks.md`, tâche n° 3) |
| `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` / `_SECRET` | GitHub › Settings › Developer settings › OAuth Apps (tâche n° 4) |

En production, ces valeurs se saisissent dans Supabase › Authentication › Providers.
**Vérifier** : le bouton « Continuer avec Google » ouvre la page de Google.

## 3. Variables ponctuelles (jamais enregistrées)

| Variable | Commande | Usage |
|----------|----------|-------|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME` | `npm run admin:create` | Créer un super administrateur ou changer son mot de passe |
| `SUPABASE_DB_URL` | `npm run db:backup` | Sauvegarder la base de production (Supabase › Project Settings › Database › Connection string) |

Elles se donnent seulement le temps de la commande, par exemple
`ADMIN_EMAIL=vous@domaine.fr ADMIN_PASSWORD=… npm run admin:create`.

## 4. Réglages faits dans l'administration (sans toucher au code)

Administration › Paramètres :

| Réglage | Où le trouver | Format |
|---------|---------------|--------|
| Google Ads — ID de conversion | Google Ads › Objectifs › Conversions › votre action › Configuration de la balise | `AW-123456789` |
| Google Ads — libellé « inscription » | Même page, partie après la barre oblique de `send_to` | `AbC-12dEf` |
| Google Analytics 4 | Analytics › Administration › Flux de données | `G-ABC123XYZ` |
| Pixel Meta | Gestionnaire d'évènements Meta › Sources de données | 8 à 20 chiffres |
| LinkedIn Insight Tag | Campaign Manager › Données analytiques › Insight Tag | 4 à 12 chiffres |
| Email de contact | Votre adresse professionnelle | email |

**Vérifier un pixel** : ouvrir le site en navigation privée, accepter le bandeau, puis utiliser
l'extension « Tag Assistant » (Google) ou « Meta Pixel Helper ».
**Rappel légal** : compléter la politique de confidentialité avant d'activer un pixel (tâche n° 14).

## 5. Ports locaux

| Service | Adresse |
|---------|---------|
| Application (développement) | http://localhost:3000 |
| Application (image de production) | http://localhost:3001 |
| API Supabase | http://127.0.0.1:55321 |
| Base PostgreSQL | 127.0.0.1:55322 |
| Supabase Studio | http://127.0.0.1:55323 |
| Emails de test (Mailpit) | http://127.0.0.1:55324 |
