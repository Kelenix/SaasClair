# Guide d'intervention (runbook)

> Que faire quand quelque chose ne va pas. Chaque fiche : symptôme, diagnostic, résolution.
> Après un incident réel, ajouter une note « post-mortem » en bas de ce fichier.

## 1. Le site ne répond plus

Raccourci utilisé ci-dessous, sur le VPS :
`dc="docker compose --env-file /srv/saasclair/.env -f /srv/saasclair/deploy/compose.prod.yaml"`

**Diagnostic**
1. `curl https://saasclair.com/api/health` : pas de réponse → application ou Nginx en panne.
2. `$dc ps` (quelle couleur tourne ?), puis `$dc logs --tail=100 web-blue` (ou `web-green`).
3. `systemctl status nginx` et `nginx -t` : une erreur dans **un autre site** du serveur peut
   empêcher Nginx de recharger.
4. `df -h` (disque plein ?) et `docker stats --no-stream` (mémoire ?).

**Résolution**
- Après un déploiement fautif, ou aucune couleur en service :
  `sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --rollback` (instantané), ou
  relancer un déploiement depuis GitHub (Actions › Deploy).
- Disque plein : `docker image ls ghcr.io/kelenix/saasclair`, puis `docker rmi` des plus anciennes.
  Jamais `docker system prune` : il toucherait les autres sites du serveur.

## 2. La sonde complète renvoie « degrade » (503)

`/api/health?complet=1` indique `auth` ou `database` en échec.

- **Service arrêté** : `$dc ps`, puis `sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --restart`.
- **Mémoire saturée** (le serveur héberge d'autres sites) : `docker stats --no-stream`,
  `dmesg | grep -i oom`. Les limites par service sont dans `deploy/compose.prod.yaml`.
- **Certificat expiré** sur `api.saasclair.com` : `certbot renew`, puis `systemctl reload nginx`.
- **Premier appel après redémarrage** : un délai unique est normal ; relancer la sonde.

## 3. Personne ne peut se connecter

- « Email ou mot de passe incorrect » pour tous : `$dc logs --tail=100 auth`.
- « Mot de passe oublié » ne part pas : SMTP non renseigné dans `/srv/saasclair/.env` (tâche n° 11).
- Retour vers une mauvaise adresse après connexion : `SITE_URL` dans le `.env`.
- Google / GitHub : « fournisseur désactivé » → tâches manuelles n° 3 et 4.

## 4. Un client signale un écran vide ou une erreur

1. Reproduire avec son type de compte (client, administrateur, compte suspendu).
2. Lire les journaux serveur à l'heure signalée.
3. Écrire un test qui reproduit le problème (Vitest ou Playwright), corriger, livrer une version
   corrective (`1.0.x`), noter la cause ci-dessous.

## 5. Les modifications de l'administration n'apparaissent pas sur le site

Les contenus publics sont en cache (étiquette `contenu-du-site`), rafraîchis à chaque
modification. Si une modification faite directement en base (SQL) n'apparaît pas : redémarrer
le conteneur web, ou refaire la modification depuis l'administration.

## 6. Un compte doit être bloqué en urgence

Administration › Utilisateurs › fiche › Statut « Suspendu » : le tableau de bord se ferme
immédiatement. Pour un super administrateur compromis : retirer le rôle depuis un autre compte,
puis changer son mot de passe (`npm run admin:create` avec le même email).

## 7. Fuite ou soupçon de fuite d'un secret

1. **Clé de service ou secret JWT** : régénérer ensemble `JWT_SECRET`, `ANON_KEY` et
   `SERVICE_ROLE_KEY` (tout le monde est déconnecté). Mettre l'ancien `.env` de côté, relancer
   `gen-env.sh`, y reporter le mot de passe de la base, le SMTP et l'OAuth, mettre à jour la
   variable GitHub `NEXT_PUBLIC_SUPABASE_ANON_KEY`, puis redéployer.
2. **Mot de passe de la base** : `alter user … with password` pour `postgres`, `authenticator`
   et `supabase_auth_admin`, puis `POSTGRES_PASSWORD` dans le `.env` et `deploy.sh --restart`.
3. **Clé SSH de déploiement** : la retirer de `/home/deploy/.ssh/authorized_keys`, en créer une
   nouvelle, mettre à jour le secret GitHub `VPS_SSH_KEY`.
4. Secrets OAuth : les régénérer chez Google / GitHub, puis dans le `.env` du serveur.
3. Webhook Slack d'un client : le client le retire depuis ses Paramètres d'alertes.
4. Consigner l'incident (date, portée, mesures) ; si des données personnelles sont exposées,
   notification à la CNIL sous 72 heures.

## 8. Restaurer une sauvegarde

```bash
npx supabase db reset
```

```bash
psql "postgresql://postgres:postgres@127.0.0.1:55322/postgres" -f backups/AAAA-MM-JJ_HHMM/donnees.sql
```

**En production**, à partir des sauvegardes de `/srv/saasclair/backups` (prises chaque nuit et
avant chaque migration) :

```bash
sudo -u deploy bash /srv/saasclair/deploy/scripts/backup.sh avant-restauration
$dc stop web-blue web-green auth rest
$dc exec -T db pg_restore -h localhost -U supabase_admin -d postgres --clean --if-exists --single-transaction < /srv/saasclair/backups/<fichier>.dump
sudo -u deploy bash /srv/saasclair/deploy/scripts/deploy.sh --restart
```

`--restart` relance Auth, l'API, puis la dernière version de l'application.

## 9. Problèmes connus en développement (Windows)

| Symptôme | Cause | Résolution |
|----------|-------|------------|
| « Module not found » pour un fichier qui existe | La synchronisation `docker compose watch` a manqué un fichier | `docker compose cp fichier web:/app/fichier`, ou relancer `npm run up` |
| Changement de CSS sans effet | Le serveur de développement n'a pas vu le changement | `docker compose restart web` |
| Page qui se recharge en boucle dans le navigateur intégré de l'éditeur | Conflit avec le rechargement à chaud | Ouvrir l'image de production (`npm run up:prod`, port 3001) ou Chrome |
| `npm run dev` démarre sur le port 3002 | Le conteneur occupe déjà le port 3000 | Utiliser `npm run up` seul |
| Erreur « uncached data … outside of Suspense » | Règle de Next.js 16 | Lire cookies, session ou heure dans un composant sous `<Suspense>`, après `connection()` |

## Post-mortems

_Aucun incident en production à ce jour._
