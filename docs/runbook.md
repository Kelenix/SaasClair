# Guide d'intervention (runbook)

> Que faire quand quelque chose ne va pas. Chaque fiche : symptôme, diagnostic, résolution.
> Après un incident réel, ajouter une note « post-mortem » en bas de ce fichier.

## 1. Le site ne répond plus

**Diagnostic**
1. `curl https://votre-domaine/api/health` : pas de réponse → application ou Nginx en panne.
2. Sur le VPS : `docker compose ps` puis `docker compose logs --tail=100 web`.
3. `df -h` (disque plein ?) et `docker stats` (mémoire ?).

**Résolution**
- Conteneur arrêté : `docker compose up -d`.
- Disque plein : `docker image prune -a` (images anciennes), vider les anciens journaux.
- Après un déploiement fautif : revenir à l'image précédente (étiquette de version) et relancer.

## 2. La sonde complète renvoie « degrade » (503)

`/api/health?complet=1` indique `auth` ou `database` en échec.

- **Supabase en panne** : vérifier https://status.supabase.com ; rien à faire côté SaasClair.
- **Clé ou adresse Supabase erronées** : vérifier `NEXT_PUBLIC_SUPABASE_URL` et
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env` du VPS (voir `docs/configuration.md`).
- **Premier appel après redémarrage** : un délai unique est normal ; relancer la sonde.

## 3. Personne ne peut se connecter

- Message « Email ou mot de passe incorrect » pour tous : vérifier le service Auth (sonde).
- Les emails de confirmation n'arrivent pas : service d'envoi SMTP non configuré dans Supabase
  (Authentication › Emails), ou adresse du site absente des URL de redirection autorisées.
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

1. Clé de service Supabase : la régénérer (Project Settings › API), mettre à jour `.env` du VPS,
   redéployer.
2. Secrets OAuth : les régénérer chez Google / GitHub, puis dans Supabase.
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

En production : restaurer depuis le tableau de bord Supabase (Database › Backups) de
préférence ; la restauration manuelle (`schema.sql`, `roles.sql` puis `donnees.sql`) se fait
sur une base vide, après une sauvegarde de l'état courant.

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
