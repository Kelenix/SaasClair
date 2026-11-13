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

- Seule la clé publique `anon` est exposée au navigateur. La clé `service_role` n'est utilisée nulle part pour l'instant.
- `.env` et `supabase/.env` sont ignorés par Git et exclus de l'image Docker.
- Le compte de démonstration de `supabase/seed.sql` n'existe qu'en local (le fichier n'est jamais appliqué en production).

## Données des projets (incrément 4)

- Table `projects` : RLS activée, lecture / création / modification limitées au propriétaire (`auth.uid()`), suppression ajoutée à l'incrément 7. Advisors de sécurité Supabase : aucune alerte.
- **Vérifié avec un second compte** : il ne voit aucun projet, ne peut pas modifier celui de Nadia, et la création d'un projet au nom d'un autre est refusée (`42501`). Un visiteur anonyme ne voit rien.
- Contrainte SQL : Stripe ne peut pas être marqué connecté avant le script.

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
- **Newsletter** : la RLS n'autorise que l'insertion publique (aucune lecture), et le formulaire contient un piège à robots. **À prévoir en production** : une limite de débit dans Nginx.

## Formulaires de compte (incrément 8)

- Les 4 formulaires (inscription, connexion, mot de passe oublié, nouveau mot de passe) sont en `method="post"`. Avant ce correctif, un envoi parti avant que React ne l'intercepte se faisait en GET, avec l'email et le mot de passe dans l'adresse (historique, journaux du serveur). Constaté par les tests de bout en bout, couvert par `e2e/security.spec.ts`.

## Alertes, confidentialité et suppression (incrément 7)

- Table `alert_settings` : RLS (lecture, création, modification par le seul propriétaire). **Vérifié** : un autre compte ne voit aucune ligne et sa modification ne touche rien (`UPDATE 0`).
- Webhook Slack : validé par Zod et par une contrainte SQL (`https://hooks.slack.com/services/…` uniquement), **jamais renvoyé au navigateur** (seul « connecté oui / non » l'est). Il donne le droit de poster dans un canal : à traiter comme un secret.
- Suppression du projet : politique RLS `projects_delete_own`, action serveur qui exige de retaper l'adresse du site, et efface aussi `insight_feedback`. Le compte et ses réglages d'alertes restent.
- Anonymisation des visiteurs : colonne `projects.anonymize_visitors`, active par défaut. Elle s'appliquera à la collecte réelle (pas encore de collecte).

## Audit d'URL et SSRF (incrément 4)

- L'audit télécharge une page fournie par l'utilisateur : chaque hôte (et chaque redirection, 3 au maximum) est résolu et refusé s'il pointe vers une adresse interne (privée, boucle locale, lien local, CGNAT, multicast, IPv6 équivalentes ; testé).
- Ports 80 et 443 uniquement, délai de 8 s, 1,5 Mo lus au maximum, HTML uniquement, réservé aux utilisateurs connectés.
- Risque résiduel : rebinding DNS entre la vérification et la connexion. Parade possible si besoin : épingler l'adresse résolue (agent HTTP personnalisé) ou passer par un proxy sortant.

## Points ouverts

- Rate limiting : celui de Supabase Auth s'applique ; la limitation Nginx arrivera avec le déploiement (incrément 9).
- CSP avec `'unsafe-inline'` pour les scripts (scripts en ligne de Next.js) : à durcir avec un nonce si besoin.
- Double authentification (.docx §8) : prévue côté Supabase, pas encore exposée dans l'interface (évolution).
- Envoi réel des alertes (email, Slack) : pas encore de moteur d'alertes ; les réglages sont enregistrés et seront lus par lui.
