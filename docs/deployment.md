# Déploiement en production

> SaasClair tourne sur le VPS Hostinger (`69.62.116.243`, Ubuntu 24.04, KVM 1), **à côté des
> sites déjà en ligne**, avec Supabase auto-hébergé sur le même serveur. Décision : ADR-021.

## Vue d'ensemble

```
Internet ── Nginx du serveur (80/443, déjà là pour les autres sites)
              ├─ saasclair.com, www ──► application  127.0.0.1:3110 (blue) │ 3111 (green)
              └─ api.saasclair.com
                   ├─ /auth/v1/  ──► Auth (GoTrue)            127.0.0.1:3120
                   ├─ /rest/v1/  ──► API de données (PostgREST) 127.0.0.1:3121
                   └─ /modeles-email/ ► supabase/templates (lus par Auth)
                                         PostgreSQL 17        127.0.0.1:3130 (jamais public)
```

| Élément | Où | Rôle |
|---|---|---|
| `deploy/compose.prod.yaml` | `/srv/saasclair/deploy/` | Base, Auth, API, application (2 couleurs) |
| `/srv/saasclair/.env` | serveur uniquement (600) | Secrets nés sur le serveur, ports, SMTP, OAuth |
| `deploy/nginx/saasclair.conf` | `/etc/nginx/sites-available/saasclair.conf` | Site + API, fichier à part |
| `deploy/scripts/*.sh` | `/srv/saasclair/deploy/scripts/` | Amorçage, déploiement, migrations, sauvegarde |
| `.github/workflows/deploy.yml` | GitHub | Contrôles → image GHCR → serveur |

## Registre des ports du VPS

| Port (127.0.0.1) | Service | Variable du `.env` |
|---|---|---|
| 3000 – 3002 | **autres sites** (ne pas toucher) | — |
| 3110 | SaasClair, application (blue) | `WEB_PORT_BLUE` |
| 3111 | SaasClair, application (green) | `WEB_PORT_GREEN` |
| 3120 | SaasClair, Auth | `AUTH_PORT` |
| 3121 | SaasClair, API de données | `REST_PORT` |
| 3130 | SaasClair, PostgreSQL | `DB_PORT` |

Un port pris ? L'amorçage s'arrête en le nommant. Changer la valeur dans le `.env`, puis
`FORCE_NGINX=1` à la relance de l'amorçage (Nginx est régénéré, certbot y remet le HTTPS).

## Mise en place (une seule fois)

1. **Accès administrateur par clé** : ajouter la clé publique `saasclair_admin` (créée sur le
   poste dans `%USERPROFILE%\.ssh`) aux clés de `root` (voir `docs/manual-tasks.md`, tâche 5).
2. **DNS** chez Hostinger : trois enregistrements `A` vers `69.62.116.243` : `@`, `www`, `api`.
   Retirer les anciens `A`/`AAAA` qui pointent ailleurs (`2.57.91.91` aujourd'hui).
3. **Inspection en lecture seule**, depuis la racine du projet :
   ```bash
   scp -i ~/.ssh/saasclair_admin deploy/scripts/inspect.sh root@69.62.116.243:/root/
   ssh -i ~/.ssh/saasclair_admin root@69.62.116.243 "bash /root/inspect.sh"
   ```
4. **Copie des fichiers, puis amorçage** :
   ```bash
   ssh -i ~/.ssh/saasclair_admin root@69.62.116.243 "mkdir -p /srv/saasclair/supabase"
   scp -i ~/.ssh/saasclair_admin -r deploy root@69.62.116.243:/srv/saasclair/
   scp -i ~/.ssh/saasclair_admin -r supabase/migrations supabase/templates root@69.62.116.243:/srv/saasclair/supabase/
   ssh -i ~/.ssh/saasclair_admin root@69.62.116.243 "DOMAIN=saasclair.com EMAIL=<email> DEPLOY_KEY='$(cat ~/.ssh/saasclair_deploy.pub)' bash /srv/saasclair/deploy/scripts/bootstrap.sh"
   ```
   L'amorçage installe ce qui manque (Docker, Nginx, certbot), démarre Supabase, applique les
   migrations, ajoute le site Nginx, obtient les certificats si les DNS sont prêts, programme la
   sauvegarde de nuit. Il affiche `VPS_FINGERPRINT` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. **Environnement GitHub `production`** (dépôt `Kelenix/SaasClair` › Settings › Environments) :

   | Type | Nom | Valeur |
   |---|---|---|
   | Secret | `VPS_HOST` | `69.62.116.243` |
   | Secret | `VPS_SSH_KEY` | contenu de `~/.ssh/saasclair_deploy` (clé privée de la CD) |
   | Secret | `VPS_FINGERPRINT` | affiché par l'amorçage (`SHA256:…`) |
   | Variable | `NEXT_PUBLIC_SUPABASE_URL` | `https://api.saasclair.com` |
   | Variable | `NEXT_PUBLIC_SITE_URL` | `https://saasclair.com` |
   | Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | affichée par l'amorçage (clé publique) |
   | Variable | `DEPLOY_ENABLED` | `true` (active le déploiement automatique) |

6. **Premier déploiement** : Actions › Deploy › *Run workflow* (ou un envoi sur `main`).
7. **Compte super administrateur**, par vous, dans votre propre session SSH :
   ```bash
   ssh -i ~/.ssh/saasclair_admin root@69.62.116.243
   sudo -u deploy bash /srv/saasclair/deploy/scripts/create-admin.sh <votre email> <prénom>
   ```
   Le mot de passe est demandé deux fois, sans s'afficher, et n'est enregistré nulle part.

## Chaque livraison (automatique)

`git push` sur `main` → `deploy.yml` :

1. contrôles complets (`ci.yml` : lint, types, tests unitaires, audit, secrets, tests de bout en bout) ;
2. image construite et publiée sur GHCR (`ghcr.io/kelenix/saasclair:<commit>`) ;
3. fichiers du serveur copiés (`deploy/`, migrations, modèles d'emails) ;
4. sur le serveur, `deploy.sh` : Supabase à jour, **sauvegarde puis migrations**, nouvelle version
   démarrée sur l'autre couleur, contrôle de santé complet (`/api/health?complet=1`), bascule ;
5. vérification depuis Internet.

À la moindre erreur (démarrage, santé), la nouvelle version est arrêtée : **la version en service
ne bouge pas**. Les migrations doivent rester compatibles avec la version précédente
(ajouter avant de retirer) : l'ancienne version tourne quelques secondes sur le nouveau schéma.

## Retour arrière

```bash
sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --rollback
```

Instantané : la version précédente est toujours sur le serveur (l'autre couleur). Pour une version
plus ancienne : Actions › Deploy › relancer l'exécution du commit voulu. Une migration n'est jamais
annulée automatiquement : restaurer la sauvegarde prise juste avant (`docs/runbook.md`).

## Changer un réglage (SMTP, Google, ports…)

```bash
sudo -u deploy nano /srv/saasclair/.env
sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --restart
```

`--restart` recrée Auth ou la base si leur configuration a changé, puis relance l'application sur
l'autre couleur, sans coupure.

## Mettre à jour Supabase

Les versions sont figées dans `deploy/compose.prod.yaml`, alignées sur la CLI locale. Pour monter
de version : changer le tag, lancer la répétition locale, puis livrer normalement.

## Répétition locale

```bash
bash deploy/rehearsal.sh            # base neuve, migrations, image, déploiement, données de démo
BASE_URL=http://saasclair.localhost:3150 npm run test:e2e
bash deploy/rehearsal.sh deploy     # nouvelle image : teste la bascule sans coupure
bash deploy/rehearsal.sh down       # efface tout
```

Mêmes fichiers que la production (compose, Nginx, scripts), sur Docker Desktop.
`saasclair.localhost` et `api.saasclair.localhost` remplacent les vrais domaines.

## Sauvegardes

- Chaque nuit à 3 h 15 et avant chaque migration : `/srv/saasclair/backups/*.dump`, 14 jours.
- Restauration : `docs/runbook.md`.
- À faire : copie hors du serveur (dette P1, `docs/tech-debt.md`).
