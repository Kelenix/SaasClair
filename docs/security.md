# Sécurité — SaasClair

> Revue de l'incrément 3 (inscription et connexion). Complétée à chaque incrément sensible.

## Authentification

| Point | Mise en œuvre |
|---|---|
| Fournisseur | Supabase Auth (email + mot de passe ; Google et GitHub prêts, activés dès que les clés sont fournies) |
| Session | Cookies gérés par `@supabase/ssr` (SameSite=Lax), rafraîchis par `src/proxy.ts` |
| Vérification | `getUser()` interroge Supabase à chaque rendu protégé : jamais de confiance dans le seul cookie |
| Pages privées | `/configuration` et `/app` : redirection « optimiste » par le proxy + contrôle serveur dans la page |
| Mots de passe | 8 caractères minimum (formulaire, serveur et `supabase/config.toml`), 72 maximum (limite bcrypt) |
| Réinitialisation | Lien à usage unique (flux PKCE) ; même réponse que le compte existe ou non (pas d'énumération) |
| Confirmation d'email | **Obligatoire en production** (`GOTRUE_MAILER_AUTOCONFIRM: "false"`, envoi par Resend), désactivée en local ; le formulaire affiche « Regardez vos emails » |

## Validation et erreurs

- Toutes les entrées sont revalidées côté serveur avec les mêmes schémas Zod que le formulaire (`src/features/auth/schemas.ts`).
- Les erreurs Supabase sont traduites en messages bienveillants, sans détail technique (`src/features/auth/errors.ts`).
- Redirections après connexion limitées aux chemins internes (`src/lib/safe-redirect.ts`, testé) : pas de redirection ouverte.

## En-têtes HTTP (`next.config.ts`)

`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
`Permissions-Policy`, en-tête `X-Powered-By` retiré. En production : **CSP** (`default-src 'self'`, connexions limitées
à Supabase, `frame-ancestors 'none'`) et **HSTS**. Vérifié sur le build de production : aucune violation sur les pages d'accès.

## Secrets

- Seule la clé publique `anon` est exposée au navigateur. La clé `service_role` n'est utilisée que côté serveur (`src/lib/supabase/service.ts`, `server-only`), toujours après un contrôle d'identité, une signature (webhook) ou un secret (tâche horaire) : réception des visites, import Stripe, étapes faites, analyses automatiques, newsletter, suppression de compte.
- `.env` et `supabase/.env` sont ignorés par Git et exclus de l'image Docker.
- Le compte de démonstration de `supabase/seed.sql` n'existe qu'en local (le fichier n'est jamais appliqué en production).

## Données des projets (incrément 4)

- Table `projects` : RLS activée, lecture / création / modification limitées au propriétaire (`auth.uid()`), suppression ajoutée à l'incrément 7. Advisors de sécurité Supabase : aucune alerte.
- **Vérifié avec un second compte** : il ne voit aucun projet, ne peut pas modifier celui de Nadia, et la création d'un projet au nom d'un autre est refusée (`42501`). Un visiteur anonyme ne voit rien.
- **Droits par colonne** (audit, A3, migration `projects_column_privileges`) : un compte n'écrit que `site_url`, `audit`, `audited_at`, `setup_skipped_at`, `billing_provider`, `checkout_url`, `signup_url`, `pricing_url`, `anonymize_visitors` (et `owner_id`, contrôlé par la RLS). « Site relié », « Stripe connecté », le compte Stripe et l'identifiant ne sont écrits que par le serveur. **Vérifié** sur la base : mise à jour du compte Stripe et choix de l'identifiant refusés (`permission denied`), adresse du site acceptée.

## Espace super administrateur

- **Rôle** : `profiles.role` (`user` ou `super_admin`). Aucune politique ne permet à un utilisateur de modifier son propre profil, donc pas d'élévation de rôle possible. **Vérifié** : un client qui tente de se passer super administrateur modifie 0 ligne.
- **Contrôle d'accès en trois couches** :
  - le proxy redirige les visiteurs non connectés ;
  - `requireSuperAdmin()` vérifie le rôle côté serveur, à chaque page et à chaque action ;
  - les politiques RLS s'appuient sur `is_super_admin()` (fonction `security definer`, sans récursion).
- **Vérifié** : un client voit 1 profil, l'administrateur 62. Un visiteur ne lit que les contenus publiés : FAQ, témoignages, page À propos, et identifiants publicitaires (publics par nature). L'export CSV est refusé sans le rôle.
- **Clé de service** : utilisée seulement côté serveur, dans l'action de suppression de compte, après vérification du rôle et saisie de l'email. Jamais envoyée au navigateur.
- **Journal** : chaque action du super administrateur est tracée dans `admin_audit_log` (lecture réservée).
- **Export CSV** : les cellules qui commencent par `=`, `+`, `-` ou `@` sont neutralisées, pour empêcher l'injection de formules dans les tableurs.
- **Pixels publicitaires** :
  - les identifiants sont validés au format officiel (formulaire, serveur et contraintes SQL) ; aucun code libre n'est accepté ;
  - les scripts ne se chargent qu'après consentement, et jamais dans le tableau de bord des clients ;
  - la CSP de production n'autorise que les domaines Google, Meta et LinkedIn concernés.
- **Provenance** : le cookie interne `sc_provenance` (30 jours) garde le canal du premier passage, uniquement pour attribuer l'inscription. Aucun envoi à un tiers.
- **Newsletter** : inscription par le formulaire seulement (piège à robots, 5 par IP et par quart d'heure), écrite par le serveur ; l'insertion directe par l'API publique est fermée (migration `newsletter_server_only`). Même réponse qu'une adresse soit déjà inscrite ou non.

## Formulaires de compte (incrément 8)

- Les 4 formulaires (inscription, connexion, mot de passe oublié, nouveau mot de passe) sont en `method="post"`. Avant ce correctif, un envoi parti avant que React ne l'intercepte se faisait en GET, avec l'email et le mot de passe dans l'adresse (historique, journaux du serveur). Constaté par les tests de bout en bout, couvert par `e2e/security.spec.ts`.

## Alertes, confidentialité et suppression (incrément 7)

- Table `alert_settings` : RLS (lecture, création, modification par le seul propriétaire). **Vérifié** : un autre compte ne voit aucune ligne et sa modification ne touche rien (`UPDATE 0`).
- Webhook Slack : validé par Zod et par une contrainte SQL (`https://hooks.slack.com/services/…` uniquement), **jamais renvoyé au navigateur** (seul « connecté oui / non » l'est). Il donne le droit de poster dans un canal : à traiter comme un secret.
- Suppression du projet : politique RLS `projects_delete_own`, action serveur qui exige de retaper l'adresse du site (ou « supprimer » sans adresse), **coupe d'abord l'accès Stripe chez Stripe** (`/oauth/deauthorize`), et efface aussi `insight_feedback`. Même chose pour la suppression d'un compte par l'administrateur.
- Collecte anonyme par construction (plus d'interrupteur, qui ne faisait rien) : aucune adresse IP enregistrée, aucun cookie, identifiant aléatoire gardé 13 mois au plus dans le navigateur, emails réduits à une empreinte SHA-256, **visites effacées au bout de 25 mois** (tâche horaire).

## Audit d'URL et SSRF (incrément 4)

- L'audit télécharge une page fournie par l'utilisateur (`src/features/setup/safe-get.ts`) : la résolution DNS est vérifiée **au moment de la connexion** (option `lookup` de `https.request`), donc l'adresse contrôlée est celle utilisée — plus de rebinding DNS possible. Chaque redirection (3 au maximum) est revérifiée.
- Adresses refusées : privées, boucle locale, lien local, CGNAT, bancs d'essai, multicast, et en IPv6 toutes les formes qui cachent une IPv4 interne (`::ffff:7f00:1`, `::a.b.c.d`, `64:ff9b::/96`, `2002::/16`) ; testé.
- Ports 80 et 443 uniquement, délai de 8 s, 1,5 Mo lus au maximum, HTML uniquement, réservé aux utilisateurs connectés, **10 analyses par heure et par compte**.

## Limites de débit (audit, A2 et A5)

- Nginx limite le site, l'API et l'authentification par adresse IP (`deploy/nginx/saasclair.conf`).
- Connexion : 8 mots de passe ratés par email et 30 par IP en 15 minutes ; inscription, mot de passe oublié et lien magique : 10 emails par IP en 15 minutes (`src/features/auth/actions.ts`). Nécessaire car les appels à Supabase Auth partent du serveur : Supabase ne voit pas l'IP du visiteur.
- Réception des visites (`/api/collect`) : 120 par minute et par IP, 50 000 par heure et par site, corps limité à 4 Ko même sans `Content-Length`. Un projet sans adresse apprend celle de sa première visite, puis refuse les autres sites.
- Limiteurs en mémoire (une seule instance de l'application) : remis à zéro au redémarrage.

## Comptes Stripe des clients (lot B4)

- Lecture seule en pratique : uniquement des requêtes `GET` sur le compte connecté (en-tête
  `Stripe-Account`), version de l'API figée (`2025-03-31.basil`), nouvel essai limité (4) après
  « trop de requêtes » ou erreur passagère.
- Notifications en temps réel (`/api/stripe/webhook`, point Connect) : signature HMAC vérifiée
  avec `STRIPE_CONNECT_WEBHOOK_SECRET` (5 minutes de tolérance) ; compte inconnu ignoré ; le
  message n'est jamais cru : l'objet est relu chez Stripe. Identifiants filtrés
  (`[A-Za-z0-9_]`) avant d'être placés dans une adresse.
- « Application déconnectée » depuis Stripe : lien coupé et données Stripe du projet effacées.

## Chaîne de déploiement (audit, A8)

- Actions GitHub épinglées par empreinte de commit (étiquette notée en commentaire).
- Stripe simulé : trois verrous (`STRIPE_MOCK`, `DEMO_DATA`, adresse différente de saasclair.com).
- `main` exige les contrôles quality, secrets, image et e2e ; fusion automatique quand ils passent.

## Suppression du compte

- Par l'utilisateur (Paramètres › Confidentialité, email retapé) ou par le super administrateur
  (fiche utilisateur). Dans les deux cas (`src/features/account/erase.ts`) : accès Stripe Connect
  coupé chez Stripe, abonnement SaasClair arrêté aussitôt, puis compte effacé (projet, visites,
  données Stripe, réglages, alertes : suppression en cascade). Un échec chez Stripe laisse le
  compte intact. Un super administrateur ne peut pas se supprimer lui-même.

## Double authentification et session (lot A7)

- Super administrateur : application d'authentification (TOTP) obligatoire. `is_super_admin()`
  exige `aal2` dans le jeton : toute politique RLS d'administration refuse une session simple
  (**vérifié** : 1 profil visible en `aal1`, 154 en `aal2`). Page `/double-authentification` :
  ajout par QR code, puis code à chaque session ; 5 essais par 5 minutes et par compte.
- Changer d'appareil : uniquement par SSH (`deploy/scripts/reset-admin-2fa.sh <email>`), jamais
  depuis une session simple.
- Cookies de session Supabase en `httpOnly` (serveur et proxy) : un script injecté ne peut pas
  lire la session. Le navigateur n'utilise jamais Supabase directement : Google et GitHub sont
  démarrés par le serveur, qui pose aussi la clé de vérification (PKCE) dans un cookie réservé.

## Points ouverts
- CSP avec `'unsafe-inline'` pour les scripts : un nonce est incompatible avec le pré-rendu
  partiel (`cacheComponents`), documenté par Next.js. Compensé par `script-src-attr 'none'`,
  `object-src 'none'`, une politique sans domaine tiers dans l'espace connecté et la session
  `httpOnly`. À revoir si Next.js permet un jour nonce et pré-rendu ensemble.
- Clé SSH de déploiement : la restreindre à `deploy.sh` dans `authorized_keys` sur le serveur (action manuelle).
- `/api/health?complet=1` reste public (test de mise en ligne du déploiement), limité en débit par Nginx.
- Double authentification pour les clients (facultative) : possible avec la même mécanique, pas encore proposée.
- Alertes (lot E) : envoyées par le serveur seulement (clé de service, tâche horaire), au propriétaire du compte ; journal `alert_deliveries` en lecture seule pour son propriétaire, sans écriture possible par l'API. Tout texte venu des données (nom d'un client) est échappé dans le HTML des emails ; Slack : uniquement `hooks.slack.com`, revérifié à l'envoi, 8 s au plus.
