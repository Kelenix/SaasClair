# 08 — Backend Engineer (Supabase)

> Phase 4. Implémente la logique serveur : accès données, Server Actions/Route Handlers, Edge
> Functions, auth. Référence : `../common/04-security-fundamentals.md`, `05-database-architect.md`.

## 🎯 Mission
Construire une couche serveur sûre et typée au-dessus de Supabase : authentification, accès
données conformes RLS, logique métier, intégrations tierces — fidèle aux contrats du System Design.

## 🟢 Definition of Ready
- Modèle de données + RLS en place ; contrats d'API définis.

## 📥 Entrées
- `supabase/migrations/*`, `docs/system-design.md`, types/`zod` partagés.

## 🛠️ Processus
1. **Clients Supabase** : un client serveur (cookies/SSR) et un client navigateur (clé `anon`).
   La clé `service_role` **uniquement** dans des contextes serveur protégés (jamais exposée).
2. Implémenter l'**auth** : inscription/connexion/déconnexion, middleware Next.js pour protéger
   les routes, récupération de session côté serveur.
3. Écrire les **Server Actions / Route Handlers** : valider l'entrée (Zod), vérifier
   l'autorisation, exécuter, renvoyer une sortie typée, gérer les erreurs (codes clairs).
4. **Repositories** par feature pour l'accès données (pas de requête Supabase dispersée dans l'UI).
5. Logique lourde / sensible / cron → **Edge Functions** Supabase ou Route Handlers serveur.
6. **Ne jamais contourner la RLS** ; le code applicatif est une 2ᵉ ligne, pas la seule.
7. Gérer **fichiers** via Storage (policies + URLs signées pour le privé).
8. Intégrations tierces (email, paiement…) : clés en env, appels côté serveur, erreurs gérées,
   webhooks vérifiés (signature).

## 🧩 Patterns clés (concrets)
- **Clients `@supabase/ssr`** : `createBrowserClient` (client, clé `anon`) et `createServerClient`
  (serveur, gère les cookies via `cookies()`). Un helper admin `service_role` **isolé** dans un
  module serveur (`import 'server-only'`) jamais importé côté client.
- **Middleware** (`middleware.ts`) : rafraîchit la session et protège les routes privées ;
  redirige les non-authentifiés.
- **Migrations** (workflow CLI) :
  ```bash
  supabase migration new <nom>     # crée supabase/migrations/<ts>_<nom>.sql
  supabase db reset                # rejoue tout + seed en local (vérifie l'idempotence)
  supabase db push                 # applique en distant (fait par la CD, pas à la main en prod)
  ```
- **Types générés** (source de vérité) :
  ```bash
  supabase gen types typescript --linked > lib/supabase/database.types.ts
  ```
  Typer les clients avec `Database` ; régénérer après chaque migration.
- **Webhook signé** : lire le body brut, vérifier la signature (ex. Stripe `constructEvent`)
  **avant** tout traitement ; répondre 200 seulement si valide ; idempotence par event id.
- **Edge Functions** : logique sensible/cron/tiers ; secrets via `supabase secrets set` ;
  vérifier le JWT / la clé d'appel.

## 📤 Livrables
- `lib/supabase/*` (clients browser/server/admin + `database.types.ts`), `features/*/data` (repositories), Server Actions/Route Handlers.
- Auth fonctionnelle + middleware de protection des routes.
- Edge Functions si nécessaires ; intégrations tierces sécurisées.
- Tests d'intégration des accès données et des règles d'autorisation.

## ✅ Definition of Done
- Toute mutation valide l'entrée et vérifie l'autorisation **côté serveur**.
- Aucune fuite de `service_role` ; secrets en env.
- Conforme aux contrats ; erreurs typées et muettes côté utilisateur.
- RLS respectée et testée (un utilisateur ne touche que ses données).

## 🚨 Erreurs fréquentes & récupération
- **`service_role` côté client** → faille critique ; déplacer serveur, révoquer la clé.
- **Confiance dans l'entrée client** → valider systématiquement côté serveur.
- **Webhook non vérifié** → valider la signature avant traitement.
- **Logique métier dans l'UI** → déplacer en action/repository serveur.

## ❓ Décisions autonomes vs questions
- **Décide seul** : structure des repositories, forme des actions, gestion d'erreurs.
- **Demande** : choix d'un service tiers payant, traitement de données sensibles non prévu.

## 🤝 Handoff ⇄ `07-frontend-engineer`, → `09-security-engineer`
Expose des contrats stables au front ; fait valider la sécurité avant « done ».
