# Maintenance

> Comment garder SaasClair sûr, à jour et disponible. Incidents : `docs/runbook.md`.
> Dette technique : `docs/tech-debt.md`.

## 1. Passe de maintenance avant lancement (faite le 31 octobre 2026)

| Contrôle | Résultat |
|----------|----------|
| Dépendances de production | **0 vulnérabilité** (`npm audit --omit=dev`) |
| Dépendances de développement | 21 alertes faibles ou modérées (ESLint, CLI shadcn) : sans effet sur le site, correction seulement par mise à jour majeure (voir dette technique) |
| Mises à jour mineures | Appliquées : React 19.3.1, Motion 14.9, Lucide 1.66, cn 0.5.1 |
| Mises à jour majeures | Reportées et tracées : TypeScript 7, ESLint 10, @types/node 26 |
| Code mort | Analyse knip : 13 exports inutiles retirés ; restes volontaires (composants d'interface complets) |
| Tests | 115 unitaires, 52 de bout en bout (parcours, accessibilité, sécurité, administration) |
| Sauvegarde | Commande `npm run db:backup` créée et testée |
| Surveillance | Sonde `/api/health?complet=1` (application, authentification, base) |
| Version | `1.0.0-rc.1` (candidate à la mise en ligne) |

## 2. Calendrier

| Fréquence | Tâche | Comment |
|-----------|-------|---------|
| Chaque jour (automatique) | Disponibilité | Moniteur externe (UptimeRobot, Better Stack…) sur `/api/health?complet=1`, alerte par email |
| Chaque jour (automatique) | Sauvegardes | Sauvegardes quotidiennes Supabase (offre Pro) et sauvegardes du VPS Hostinger |
| Chaque semaine | Lire l'état du système | Administration › État du système, journal d'activité |
| Chaque semaine | Alertes de sécurité | Dependabot / `npm audit --omit=dev` (la CI échoue sur une alerte élevée) |
| Chaque mois | Mises à jour mineures | `npm outdated`, mise à jour, `npm test -- --run`, `npm run test:e2e`, déploiement |
| Chaque mois | Sauvegarde hors ligne | `SUPABASE_DB_URL=… npm run db:backup`, copie chiffrée hors du VPS |
| Chaque trimestre | Test de restauration | Restaurer la dernière sauvegarde dans une base locale (runbook) |
| Chaque trimestre | Mises à jour majeures | Une à la fois, sur une branche, avec la suite complète de tests |
| Chaque trimestre | Rotation des secrets | Clé de service Supabase, secrets OAuth, mots de passe administrateurs |
| Chaque année | Revue des accès | Liste des super administrateurs (Administration › Utilisateurs, filtre par rôle) |

## 3. Mettre à jour les dépendances

```bash
npm outdated
```

```bash
npm install paquet@version
```

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

```bash
npm run up:prod
```

```bash
npm run test:e2e
```

Règles :
- **Sécurité d'abord** : une alerte élevée ou critique en production se corrige dans la journée.
- **Une mise à jour majeure à la fois**, sur sa branche, avec sa note dans `CHANGELOG.md`.
- **Next.js et React** : lire le guide de migration dans `node_modules/next/dist/docs/` avant
  toute montée de version (cette version a des changements importants par rapport aux anciennes).
- **Image Docker** : rester sur la version LTS de Node ; les actions GitHub restent épinglées.

## 4. Base de données

- **Évolution du schéma** : `npx supabase migration new nom`, puis écrire le SQL (avec RLS),
  `npx supabase migration up` en local et `npm run db:types`. Jamais de modification d'une migration
  déjà publiée.
- **Sauvegarde manuelle** : `npm run db:backup` (local) ou
  `SUPABASE_DB_URL=… npm run db:backup` (production), avant toute opération risquée.
- **Volume** : Administration › État du système affiche la taille de la base et le nombre de
  lignes par table ; surveiller les quotas de l'offre Supabase.

## 5. Surveillance

| Signal | Où | Seuil d'action |
|--------|----|----------------|
| Disponibilité | Moniteur externe sur `/api/health?complet=1` | 2 échecs consécutifs |
| Erreurs serveur | `docker compose logs web` sur le VPS | Toute erreur répétée |
| Performance | PageSpeed Insights (mobile) sur la page d'accueil | LCP > 2,5 s |
| Paiements en retard | Administration › Abonnements | Chaque lundi |
| Base | Administration › État du système | Temps de réponse > 500 ms |

## 6. Comptes et accès

- Créer ou réinitialiser un super administrateur : `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create`.
- Les identifiants ne sont jamais écrits dans le projet ni dans Git.
- Retirer un accès : Administration › Utilisateurs › fiche › Rôle.
