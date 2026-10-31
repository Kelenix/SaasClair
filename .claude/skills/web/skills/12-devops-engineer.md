# 12 — DevOps Engineer (Docker Desktop → GitHub Actions → VPS Hostinger)

> **Deux temps** : (1) **socle de dev Docker Desktop + CI** avant l'Inc-1 ; (2) **déploiement
> automatique sur le VPS Hostinger** en phase 6. Standard commun : `../common/13-environments.md`.
> Sécurité : `../common/04-security-fundamentals.md` · Git : `../common/07-git-workflow.md`.

## 🎯 Mission
Le **même Dockerfile** sert partout : dev sur Docker Desktop, CI, prod sur le VPS. Un `git push`
sur `main` déclenche GitHub Actions qui **teste, construit l'image, applique les migrations et
déploie sur le VPS sans coupure**, avec smoke test et rollback automatiques. Personne ne se
connecte au serveur pour livrer.

## 🟢 Definition of Ready
- Socle dev : Docker Desktop installé et démarré (tâche manuelle unique, `docs/manual-tasks.md`).
- Déploiement : `npm run up:prod` OK en local, tests verts, VPS amorcé (§3), domaine pointé sur le VPS.

## 📥 Entrées
- Code, `package.json`, `.env.example`, `supabase/config.toml`, `supabase/migrations/*`.

## 🛠️ Vue d'ensemble (100 % automatisé)
```
Poste Windows (Docker Desktop)      GitHub Actions                        VPS Hostinger
npm run up                          PR        → ci.yml : lint · types · audit · secrets ·
 ├─ supabase start (Supabase local)              tests (Supabase local) · build de l'image
 └─ docker compose watch (Next.js)  push main → deploy.yml : ci → image GHCR :sha
                                                → supabase db push → scp compose + .env
                                                → SSH : bascule réplique par réplique
                                                → smoke /api/health → rollback auto si KO
```

## 1) Socle de dev — Docker Desktop (avant l'Inc-1)

`next.config.ts` : `output: 'standalone'`. Dépendance de dev : `npm i -D supabase` (CLI).

**`Dockerfile`** — dev **et** prod dans un seul fichier (multi-stage ; prod Alpine non-root) :
```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev
COPY . .
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY . .
# Les NEXT_PUBLIC_* sont figées dans le bundle au build → fournies en build args
ARG NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

**`compose.yaml`** (dev uniquement — Supabase local tourne à côté via `supabase start`) :
```yaml
services:
  net:   # porte le réseau : publie les ports et relaie 127.0.0.1:54321 → Supabase local de l'hôte
    image: alpine/socat:1.8.0.3
    command: tcp-listen:54321,fork,reuseaddr tcp-connect:host.docker.internal:54321
    extra_hosts: ["host.docker.internal:host-gateway"]
    ports: ["3000:3000", "3001:3001"]
  web:   # Next.js en dev, hot reload par synchronisation de fichiers
    build: { context: ., target: dev }
    network_mode: service:net   # même URL Supabase (127.0.0.1:54321) côté navigateur ET serveur
    env_file: .env
    develop:
      watch:
        - { action: sync, path: ., target: /app }
        - { action: rebuild, path: package-lock.json }
  web-prod:   # l'image de PROD en local, avant push → http://localhost:3001
    profiles: [prod]
    build: { context: ., args: [NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY] }
    network_mode: service:net
    env_file: .env
    environment: { PORT: 3001 }
```
> **Pourquoi le relais `net`** : dans un conteneur, `127.0.0.1` désigne le conteneur lui-même.
> Le relais rend Supabase local joignable à la **même URL** que dans le navigateur, donc pas de
> double configuration et pas de cookie d'auth désynchronisé.

**Scripts `package.json`** (identiques sur tous les projets) :
```json
"up": "supabase start && docker compose watch",
"up:prod": "docker compose --profile prod up --build web-prod",
"down": "docker compose --profile prod down && supabase stop",
"db:reset": "supabase db reset"
```
- **`.env`** (dev, gitignoré) : valeurs de `npx supabase status`, avec
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `ANON_KEY` et `SERVICE_ROLE_KEY` locales.
  Studio : http://127.0.0.1:54323 · Mailpit (emails d'auth de test) : http://127.0.0.1:54324.
- **`.dockerignore`** : `node_modules`, `.next`, `.git`, `.env*`, `!.env.example`, `coverage`,
  `playwright-report`, `supabase/.temp`. Il exclut aussi ces fichiers de la synchro `watch`, et
  aucun secret n'entre dans une image.
- **`.gitattributes`** : `* text=auto eol=lf` (scripts shell et Dockerfile restent en LF sous Windows).
- Gates (`npm run lint|typecheck|test`) : sur l'hôte (Node LTS) ou `docker compose exec web npm test`.

## 2) Prod — health check et `compose.prod.yaml`
`app/api/health/route.ts` : `export const GET = () => Response.json({ status: 'ok' })`. Le health
check reste **léger** : s'il dépendait de Supabase, une panne tierce déclencherait un rollback inutile.

**`compose.prod.yaml`** (versionné, copié sur le VPS par la CD ; ne jamais l'éditer sur le serveur) :
```yaml
x-web: &web
  image: ${COMPOSE_PROJECT_NAME}:current   # tag local posé par la CD (= /srv/<app>)
  restart: always
  env_file: .env                           # écrit par la CD depuis le secret PROD_ENV
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 20s
services:   # 2 répliques → mises à jour une par une, Nginx sert l'autre : zéro coupure
  web-a: { <<: *web, ports: ["127.0.0.1:3000:3000"] }   # paire de ports UNIQUE par app sur le VPS
  web-b: { <<: *web, ports: ["127.0.0.1:3001:3000"] }   # (3000/3001, 3010/3011…)
```
> Ports bindés sur `127.0.0.1` : l'app n'est joignable **que** via Nginx. Avec 2 répliques, le cache
> ISR est propre à chaque réplique : préférer `revalidate: <s>` ; une revalidation à la demande
> (`revalidateTag`) exige un cache partagé (Redis), sinon une seule réplique (consigner le choix).

## 3) Amorçage du VPS Hostinger (une fois par app, seule intervention serveur)
Claude exécute ces étapes lui-même si l'accès SSH root fonctionne depuis le poste. Sinon, elles
vont dans `docs/manual-tasks.md`.

1. **hPanel → VPS** : OS **Ubuntu 24.04 LTS**, clé SSH publique admin ajoutée. **DNS** : enregistrement
   `A` du domaine → IP du VPS. Pare-feu hPanel (si activé) : 22, 80 et 443 uniquement.
2. **Clé de déploiement dédiée à la CI** (jamais la clé perso) :
   `ssh-keygen -t ed25519 -C ci-<app> -f $HOME\.ssh\<app>_deploy` (sans passphrase).
3. **Amorçage** (PowerShell, depuis la racine du projet ; `<app>` = nom du dépôt GitHub en minuscules) :
   ```powershell
   scp scripts/vps-bootstrap.sh root@<IP>:/root/
   ssh root@<IP> "APP=<app> DOMAIN=<domaine> PORT=3000 EMAIL=<email> DEPLOY_KEY='$(Get-Content $HOME\.ssh\<app>_deploy.pub)' bash /root/vps-bootstrap.sh"
   ```
4. **Environnement GitHub `production`** (Claude le fait via `gh` s'il est authentifié) :
   ```powershell
   Get-Content $HOME\.ssh\<app>_deploy -Raw | gh secret set VPS_SSH_KEY --env production
   gh secret set VPS_HOST --env production --body "<IP>"
   gh secret set VPS_FINGERPRINT --env production --body "<SHA256:… affiché en fin d'amorçage>"
   Get-Content .env.production -Raw | gh secret set PROD_ENV --env production   # puis supprimer le fichier
   gh secret set SUPABASE_ACCESS_TOKEN --env production
   gh secret set SUPABASE_DB_PASSWORD --env production
   gh variable set SUPABASE_PROJECT_REF --env production --body "<ref>"
   gh variable set NEXT_PUBLIC_SUPABASE_URL --env production --body "https://<ref>.supabase.co"
   gh variable set NEXT_PUBLIC_SUPABASE_ANON_KEY --env production --body "<clé anon>"
   ```

**`scripts/vps-bootstrap.sh`** (idempotent : le relancer pour une 2ᵉ app avec un autre `APP`/`DOMAIN`/`PORT`) :
```bash
#!/usr/bin/env bash
# Amorcage idempotent d'un VPS Ubuntu 24.04 (Hostinger) pour une app. A lancer en root.
set -euo pipefail
: "${APP:?}" "${DOMAIN:?}" "${PORT:?}" "${EMAIL:?}" "${DEPLOY_KEY:?}"

# 1. Paquets Ubuntu (patchs de securite automatiques) + logs Docker bornes
export DEBIAN_FRONTEND=noninteractive
apt-get update -q && apt-get upgrade -yq
command -v docker >/dev/null || apt-get install -yq docker.io docker-compose-v2
apt-get install -yq nginx certbot python3-certbot-nginx ufw fail2ban unattended-upgrades
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' \
  > /etc/apt/apt.conf.d/20auto-upgrades
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}' > /etc/docker/daemon.json
  systemctl restart docker
fi

# 2. Utilisateur de deploiement (cle CI uniquement, groupe docker, sans mot de passe)
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh "/srv/$APP"
keys=/home/deploy/.ssh/authorized_keys
grep -qxF "$DEPLOY_KEY" "$keys" 2>/dev/null || echo "$DEPLOY_KEY" >> "$keys"
chown deploy:deploy "$keys" && chmod 600 "$keys"

# 3. SSH par cle uniquement, pare-feu, anti brute-force
# (cle hote ed25519 seule : l'empreinte verifiee par la CD est donc toujours la meme)
printf 'PasswordAuthentication no\nPermitRootLogin prohibit-password\nHostKeyAlgorithms ssh-ed25519\n' \
  > /etc/ssh/sshd_config.d/10-hardening.conf
sshd -t && systemctl reload ssh
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
systemctl enable --now fail2ban

# 4. Nginx : 2 repliques (bascule sans coupure), limitation de debit, puis TLS Let's Encrypt
cat > /etc/nginx/conf.d/00-common.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=perip:10m rate=20r/s;
map $http_upgrade $connection_upgrade { default upgrade; '' close; }
EOF
cat > "/etc/nginx/sites-available/$APP.conf" <<EOF
# max_fails=0 : toujours retenter l'autre replique (sinon les 2 peuvent etre ecartees pendant la bascule)
upstream $APP { server 127.0.0.1:$PORT max_fails=0; server 127.0.0.1:$((PORT + 1)) max_fails=0; }
server {
  listen 80;
  server_name $DOMAIN;
  client_max_body_size 10m;
  location / {
    limit_req zone=perip burst=40 nodelay;
    proxy_pass http://$APP;
    proxy_next_upstream error timeout http_502 http_503;
    proxy_connect_timeout 2s;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
  }
}
EOF
ln -sf "/etc/nginx/sites-available/$APP.conf" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --non-interactive --redirect --hsts --keep-until-expiring
echo "OK: $APP pret ($DOMAIN -> 127.0.0.1:$PORT et $((PORT + 1)))"
echo "VPS_FINGERPRINT=$(ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub | cut -d' ' -f2)"
```
> Garder la session SSH ouverte pendant le 1ᵉʳ passage et tester une nouvelle connexion par clé
> avant de fermer. Root reste accessible **par clé uniquement** (administration exceptionnelle).

## 4) CI + CD — `.github/workflows/`

**`ci.yml`** (chaque PR ; réutilisé par la CD — une seule définition des gates) :
```yaml
name: CI
on:
  pull_request:
  workflow_call:
permissions: { contents: read }
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }   # gitleaks scanne tout l'historique
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck
      - run: npm audit --audit-level=high
      - run: docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --no-banner
      - name: Supabase local (tests d'intégration / RLS)
        run: |
          npx supabase start -x studio,imgproxy,logflare,vector,supavisor
          npx supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
            --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
            --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY | tr -d '"' >> "$GITHUB_ENV"
      - run: npm test -- --run
      - if: github.event_name == 'pull_request'   # sur main, deploy.yml construit l'image
        run: docker build --build-arg NEXT_PUBLIC_SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY .
```

**`deploy.yml`** (push sur `main` → jusqu'au VPS, sans intervention) :
```yaml
name: Deploy
on:
  push: { branches: [main] }
  workflow_dispatch:   # relance manuelle (ex. après rotation d'un secret)
concurrency: { group: deploy-prod, cancel-in-progress: false }
permissions: { contents: read, packages: write }
jobs:
  ci:
    uses: ./.github/workflows/ci.yml
  image:   # construite AVANT de toucher la base : un build cassé ne migre rien
    needs: ci
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "IMAGE=ghcr.io/${GITHUB_REPOSITORY,,}" >> "$GITHUB_ENV"   # GHCR exige des minuscules
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with: { registry: ghcr.io, username: "${{ github.actor }}", password: "${{ secrets.GITHUB_TOKEN }}" }
      - uses: docker/build-push-action@v7
        with:
          push: true
          tags: ${{ env.IMAGE }}:${{ github.sha }}
          build-args: |
            NEXT_PUBLIC_SUPABASE_URL=${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
  migrate:
    needs: image
    runs-on: ubuntu-latest
    environment: production
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
    steps:
      - uses: actions/checkout@v7
      - uses: supabase/setup-cli@v3
      - run: supabase link --project-ref "${{ vars.SUPABASE_PROJECT_REF }}" && supabase db push
  deploy:
    needs: migrate
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v7
      - name: .env de prod + noms en minuscules
        env: { PROD_ENV: "${{ secrets.PROD_ENV }}" }
        run: |
          printf '%s\n' "$PROD_ENV" > .env
          repo=${GITHUB_REPOSITORY,,}
          { echo "APP=${repo#*/}"; echo "IMAGE=ghcr.io/$repo"; } >> "$GITHUB_ENV"
      - uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          fingerprint: ${{ secrets.VPS_FINGERPRINT }}
          source: compose.prod.yaml,.env
          target: /srv/${{ env.APP }}
      - uses: appleboy/ssh-action@v1
        env: { GHCR_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          fingerprint: ${{ secrets.VPS_FINGERPRINT }}
          envs: APP,IMAGE,GITHUB_SHA,GITHUB_ACTOR,GHCR_TOKEN
          script: |
            set -eu
            cd "/srv/$APP" && chmod 600 .env
            echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
            docker pull "$IMAGE:$GITHUB_SHA" && docker logout ghcr.io
            docker tag "$APP:current" "$APP:previous" 2>/dev/null || true   # 1er déploiement : rien à garder
            docker tag "$IMAGE:$GITHUB_SHA" "$APP:current"
            dc="docker compose -f compose.prod.yaml"
            rollback() { echo "Déploiement KO → rollback"; docker tag "$APP:previous" "$APP:current"; $dc up -d --wait; exit 1; }
            for s in web-a web-b; do $dc up -d --wait "$s" || rollback; done   # une réplique à la fois
            curl -fsS "http://$($dc port web-a 3000)/api/health" || rollback   # smoke test
            docker image prune -af --filter "until=168h"
```
> Une PR ne lance que `ci.yml` : merge bloqué si rouge (protection de `main`). Le push sur `main`
> enchaîne tout jusqu'au VPS. `up --wait` attend le health check de chaque réplique avant de passer
> à la suivante. Si une réplique ou le smoke test échoue, l'image précédente est remise en service.

## 5) Secrets & rollback
- **Environnement GitHub `production`** : secrets `VPS_HOST`, `VPS_SSH_KEY`, `VPS_FINGERPRINT`,
  `PROD_ENV`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` ; variables (non secrètes)
  `SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **`PROD_ENV`** = contenu complet du `.env` serveur (`SUPABASE_SERVICE_ROLE_KEY`, clés tierces…).
  La CD l'écrit sur le VPS en `chmod 600`. Changer une valeur = modifier le secret puis relancer
  `deploy.yml`. Une valeur contenant `$` se met entre apostrophes.
- `service_role` uniquement dans `PROD_ENV`, jamais en `NEXT_PUBLIC_*`. Jamais d'`echo` d'un secret.
- **Rollback automatique** : tag `<app>:previous` remis en service. **Rollback manuel** : relancer
  `deploy.yml` sur un commit antérieur (`workflow_dispatch`) ; chaque SHA reste sur GHCR.
  **Tester le rollback avant la 1ʳᵉ prod** (provoquer un health check KO).

## 📤 Livrables
- `Dockerfile`, `.dockerignore`, `.gitattributes`, `compose.yaml` (dev), `compose.prod.yaml`,
  `app/api/health/route.ts`, `scripts/vps-bootstrap.sh`, scripts npm `up`/`up:prod`/`down`/`db:reset`.
- `.github/workflows/ci.yml` (PR) + `deploy.yml` (push `main` → VPS).
- `.env.example` complet ; `docs/deployment.md` (flux, registre des ports du VPS, rollback testé) ;
  `docs/manual-tasks.md` (Docker Desktop, VPS Hostinger, DNS, environnement GitHub `production`).

## ✅ Definition of Done
- `npm run up` lance l'environnement de dev complet sur Docker Desktop (hot reload, Supabase local).
- `npm run up:prod` sert l'image de prod en local ; `docker build .` OK.
- Un `git push main` **déploie de bout en bout** sans intervention sur le serveur ; zéro coupure
  (2 répliques) ; HTTPS actif ; health check vert ; **rollback testé**.
- CI verte requise avant merge ; `npm audit` sans vuln high non justifiée ; gitleaks propre.
- Migrations appliquées uniquement par la CD (`supabase db push`) ; aucun secret exposé/loggé.

## 🚨 Erreurs fréquentes & récupération
- **`fetch failed` vers Supabase depuis le conteneur** → URL en `127.0.0.1` sans le relais `net`
  (ou `supabase start` non lancé). **Ports 54321… déjà pris** → `npx supabase stop` dans l'autre projet.
- **Hot reload inactif** → lancer `docker compose watch` (pas `up`) ; fichier exclu par `.dockerignore`.
- **`NEXT_PUBLIC_*` vides en prod** → build args manquants (variables de l'environnement `production`).
- **`invalid reference format`** → nom d'image en majuscules ; passer par `${GITHUB_REPOSITORY,,}`.
- **Script shell cassé (`\r`)** → fins de ligne CRLF ; `.gitattributes` `eol=lf` puis renormaliser.
- **Disque du VPS plein** → logs Docker bornés (bootstrap) + `image prune` à chaque déploiement.
- **Migration manuelle en prod** → toujours `supabase db push` versionné dans la CD.
- **Port exposé publiquement** → bind `127.0.0.1` + Nginx. **Conteneur root** → `USER node`.

## ❓ Décisions autonomes vs questions
- **Décide seul** : Dockerfile, compose, pipeline, config Nginx, ports, stratégie de tags et de rollback.
- **Demande** : achat/plan du VPS Hostinger ou de Supabase (coût), nom de domaine.

## 🤝 Handoff → `16-release-manager`
Socle dev + pipeline + déploiement auto + rollback testés → orchestration de la release.
