---
title: Guide développeur
description: Mise en route en moins de 30 minutes, architecture et règles du projet.
---

# Guide développeur

## Mise en route (moins de 30 minutes)

Prérequis : Node.js 24 LTS ou plus, Docker Desktop lancé.

```
npm install
npm run up
```

- Application : http://localhost:3000 (rechargement à chaud)
- Supabase Studio : http://127.0.0.1:55323 · emails de test : http://127.0.0.1:55324
- Comptes de démonstration : `supabase/seed.sql` (cliente) et `supabase/seed-admin.sql`
  (super administrateur), rejoués par `npm run db:reset`

## Architecture en bref

| Couche | Choix |
|--------|-------|
| Interface | Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind CSS 4, shadcn/ui |
| Animations | Motion 14 (transformations et opacité, « réduire les animations » respecté) |
| Données | Supabase : PostgreSQL avec RLS sur chaque table, Auth (email, Google, GitHub) |
| Validation | Zod, mêmes schémas côté formulaire et côté serveur |
| Tests | Vitest, Playwright + axe-core |

Organisation : `src/app` (routes), `src/features/<fonctionnalité>` (interface, actions, données),
`src/components` (partagé), `supabase/migrations` (schéma versionné).

Documents de référence : `docs/architecture.md`, `docs/system-design.md`, `docs/data-model.md`.

## Commandes

| Commande | Rôle |
|----------|------|
| `npm run up` / `npm run down` | Lancer / arrêter l'environnement local |
| `npm run up:prod` | Image de production locale (port 3001) |
| `npm run lint`, `npm run typecheck` | Qualité du code |
| `npm test -- --run` | Tests unitaires |
| `npm run test:e2e` | Tests de bout en bout (image de production) |
| `npm run db:reset`, `npm run db:types` | Réinitialiser la base, générer les types |
| `npm run admin:create` | Créer un super administrateur |
| `npm run db:backup` | Sauvegarder la base |
| `npm run docs:capture`, `npm run docs:build` | Captures et génération de cette documentation |

## Règles du projet

- **Next.js 16** : cookies, session et heure se lisent sous un `<Suspense>`, après `connection()`.
  Lire `node_modules/next/dist/docs/` avant d'utiliser une API inconnue.
- **Sécurité** : toute écriture passe par une action serveur validée par Zod ; RLS sur toute
  nouvelle table ; jamais de clé de service côté navigateur.
- **Base** : une évolution = une nouvelle migration (`npx supabase migration new nom`).
- **Interface** : tout en français, icônes animées (`Icon`), animations limitées aux
  transformations et à l'opacité, états chargement / vide / erreur sur chaque écran.
- **Décisions** : toute décision structurante s'ajoute à `DECISION_LOG.md` ; toute
  simplification à `docs/tech-debt.md`.

## Avant chaque livraison

```
npm run lint && npm run typecheck && npm test -- --run && npm run build
npm run up:prod
npm run test:e2e
```
