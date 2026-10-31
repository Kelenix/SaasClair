# 13 — Environnements : Docker Desktop (dev) → GitHub Actions (CI/CD) → VPS Hostinger (prod)

> Standard d'infrastructure **unique** pour tous les projets. Implémentation web détaillée
> (Dockerfile, compose, workflows, script d'amorçage) : `web/skills/12-devops-engineer.md`.
> Durcissement serveur : `[[04-security-fundamentals]]` §serveur.

## Principes

- **Une seule chaîne** : dev sur **Docker Desktop** (Windows) → CI/CD **GitHub Actions** → prod en
  conteneurs sur un **VPS Hostinger** (Docker + Nginx). Pas de PaaS ni de serverless. Tout composant
  serveur (app web, API, back-office, landing, worker, cron) est un conteneur sur le VPS.
- **Même Dockerfile partout** : il sert au dev, à la CI et à la prod. Si ça tourne en local,
  ça tourne en prod.
- **Zéro commande manuelle** après l'amorçage initial du VPS : `git push main` livre. Les seules
  tâches manuelles sont les comptes, le DNS et l'amorçage (`[[03-documentation-rules]]`).
- **Supabase** : local en dev (CLI, conteneurs Docker Desktop), projet Supabase en prod. Les
  migrations versionnées sont appliquées **uniquement** par la CD.

| | Dev (poste Windows) | CI (GitHub Actions) | Prod (VPS Hostinger) |
|---|---|---|---|
| Exécution | Docker Desktop (`docker compose watch`) | runners `ubuntu-latest` | Docker Compose + Nginx (TLS) |
| Base | Supabase local (`npx supabase start`) | Supabase local (tests) | Projet Supabase |
| Secrets | `.env` (gitignoré) | Environnement GitHub `production` | `/srv/<app>/.env` (`chmod 600`, écrit par la CD) |
| Déclencheur | `npm run up` | PR → CI · push `main` → CD | image `ghcr.io/<owner>/<repo>:<sha>` |

## Dev — Docker Desktop (Windows 11)

**Prérequis** (tâche manuelle unique) : Docker Desktop (moteur **WSL 2**, démarrage automatique),
Git, Node LTS (outillage et IDE), VS Code. Borner la RAM de WSL dans `%UserProfile%\.wslconfig`
(`[wsl2]` puis `memory=8GB`) : Supabase local consomme environ 2 Go.

| Besoin | Commande / URL |
|---|---|
| Tout démarrer (web) | `npm run up` → Supabase local + app en hot reload |
| Image de prod en local | `npm run up:prod` → http://localhost:3001 (à faire avant un push risqué) |
| Tout arrêter | `npm run down` |
| Rejouer migrations + seed | `npm run db:reset` |
| Supabase Studio / emails de test | http://127.0.0.1:54323 · Mailpit http://127.0.0.1:54324 |
| Clés locales | `npx supabase status` |

**Pièges Windows / Docker Desktop**
- **`127.0.0.1` dans un conteneur = le conteneur lui-même.** Un service de l'hôte se joint via
  `host.docker.internal`. En web, un relais garde la même URL Supabase partout (`12-devops-engineer`).
- **Un seul Supabase local à la fois** sur les ports par défaut : `npx supabase stop` dans l'autre
  projet, ou décaler les ports dans `supabase/config.toml`.
- **Fins de ligne** : `.gitattributes` avec `* text=auto eol=lf`, sinon les scripts shell et le
  Dockerfile cassent en CRLF.
- **Git Bash** convertit les chemins (`/repo` devient `C:/Program Files/Git/repo`) : préfixer
  `MSYS_NO_PATHCONV=1` aux `docker run -v …`, ou lancer la commande depuis PowerShell.
- **Hot reload** : `docker compose watch` synchronise les fichiers dans le conteneur (pas de bind
  mount lent, pas de polling).
- **Mobile** : depuis l'émulateur Android, l'hôte est `10.0.2.2` (Supabase local →
  `http://10.0.2.2:54321`) ; le simulateur iOS et le desktop utilisent `127.0.0.1` ; un appareil
  physique utilise l'IP LAN du PC.
- **Place disque** : `docker system prune` de temps en temps. `docker compose down -v` efface les
  volumes, donc les données locales.

## CI/CD — GitHub Actions

- **PR** → `ci.yml` : lint · typecheck · audit · scan de secrets · tests (avec Supabase local) ·
  build de l'image. Merge bloqué si rouge (protection de `main`).
- **Push `main`** → `deploy.yml` : CI → image GHCR `:<sha>` → migrations → copie de la config sur
  le VPS → bascule sans coupure → smoke test → **rollback automatique** si KO.
- **Secrets** dans l'**environnement GitHub `production`** (Settings → Environments) ;
  `PROD_ENV` contient le `.env` complet du serveur. Créés via `gh secret set … --env production`.
- Actions et images **épinglées** sur une version (`@v7`, `:1.8.0.3`) ; jamais `latest` en CI.

## Prod — VPS Hostinger

- **Amorçage unique par app** (script idempotent `scripts/vps-bootstrap.sh`) : Ubuntu 24.04,
  Docker, Nginx, Certbot, pare-feu `ufw`, fail2ban, mises à jour de sécurité auto, utilisateur
  `deploy` (clé SSH dédiée à la CI), SSH par clé uniquement, logs Docker bornés.
- **Plusieurs apps sur le même VPS** : un dossier `/srv/<app>/` par app ; une **paire de ports
  locaux unique** par app (3000/3001, 3010/3011…) bindée sur `127.0.0.1` ; un bloc Nginx par
  domaine. Le registre des ports est tenu dans `docs/deployment.md`.
- **Exploitation** : `ssh deploy@<IP>` puis `cd /srv/<app> && docker compose -f compose.prod.yaml logs -f`
  (ou `ps`, `docker stats`). Ressources du VPS : graphiques hPanel.
- **Sauvegardes** : sauvegardes automatiques Hostinger activées + **snapshot hPanel** avant une
  opération risquée + backups Supabase ; une restauration testée au moins une fois.
- **Plan VPS** : dimensionner sur la RAM (≈ 300 Mo par app Next.js en 2 répliques). Le choix et le
  coût du plan sont une question à poser à l'utilisateur (`[[09-ai-working-rules]]`).

## Règle d'or

> Un nouveau poste est opérationnel avec **Docker Desktop + `npm run up`**. Un nouveau serveur est
> opérationnel avec **un script d'amorçage + un `git push`**. Toute autre étape manuelle est une
> dette à automatiser ou, à défaut, à documenter dans `docs/manual-tasks.md`.
