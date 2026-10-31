# SaasClair

Application d'analyse pour créateurs de SaaS : d'où viennent vos clients, pourquoi ils n'achètent
pas et qui va partir, sans rien configurer.

## Démarrer (Docker Desktop)

Prérequis : Docker Desktop lancé, Node 24 LTS.

```bash
npm install
cp .env.example .env   # puis coller les clés affichées par `npx supabase status`
npm run up             # Supabase local + app en rechargement à chaud
```

- Application : http://localhost:3000 (système de design : `/design`)
- Supabase Studio : http://127.0.0.1:55323 · emails de test : http://127.0.0.1:55324
- Image de production en local : `npm run up:prod` → http://localhost:3001
- Tout arrêter : `npm run down`
- Ne lancez pas `npm run dev` en plus de `npm run up` : le conteneur occupe déjà le port 3000,
  Next.js démarrerait un second serveur sur 3002.
- Compte de démonstration local : voir `supabase/seed.sql` (rejoué par `npm run db:reset`).
- Super administrateur (espace `/admin`) : `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create`.
  Les identifiants ne sont jamais écrits dans le projet ; après `npm run db:reset`, relancez la
  commande.
- Si une page signale « Module not found » pour un fichier qui existe, la synchronisation Docker
  l'a manqué (cas rencontré sous Windows) : arrêtez `npm run up` (Ctrl+C) et relancez-le.

## Vérifications

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

Tests de bout en bout (parcours complet, accessibilité axe, sécurité, mobile 360 px), sur
l'image de production locale :

```bash
npm run up:prod
```

```bash
npm run test:e2e
```

Ils utilisent Chrome déjà installé et le compte de démonstration de `supabase/seed.sql`. Le
parcours crée un compte de test local à chaque exécution. Détail : `docs/qa/test-plan.md`.

## Documentation

- **Portail illustré et PDF** : `npm run docs:capture` (captures, image de production lancée), puis
  `npm run docs:build` → `docs-site/dist/index.html` et `docs/SaasClair-documentation.pdf`
- Architecture : `docs/architecture.md`, `docs/system-design.md`, `docs/data-model.md`
- Parcours et accessibilité : `docs/design/flows.md`
- Remise et configuration : `docs/handover.md`, `docs/configuration.md`
- Maintenance et incidents : `docs/maintenance.md`, `docs/runbook.md`, `docs/tech-debt.md`
- Charte éditoriale : `docs/style-guide.md` · versions : `CHANGELOG.md`

## Repères

- Plan et avancement : `docs/PLAN.md`, `PROJECT_STATE.md`
- Décisions : `DECISION_LOG.md`
- Système de design : `docs/design/design-system.md`
- Tâches à faire par vous : `docs/manual-tasks.md`
- Sécurité : `docs/security.md`
- Tests et performance : `docs/qa/test-plan.md`, `docs/performance.md`
- Logos : `npm run logos` régénère `public/brand/*` et les icônes depuis les JPEG fournis.
