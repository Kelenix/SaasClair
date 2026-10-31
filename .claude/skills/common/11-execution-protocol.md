# 11 — Protocole d'exécution (performance)

> ⭐ Comment Claude **exécute** vraiment les tâches — vite, juste, prouvé. Complète
> `[[09-ai-working-rules]]` (quand décider/demander) par le *comment faire avancer le travail*.
> Lu par `00-ai-project-director` et tous les rôles d'implémentation.

## Principe : agir, pas décrire

Quand l'action est possible et raisonnable, **fais-la** — n'explique pas ce que tu ferais.
Décrire une commande sans l'exécuter, ou dire « il faudrait tester » sans tester, n'est pas un
livrable. Un incrément n'est « fait » que **prouvé** (sortie de commande, test vert, page qui rend).

## Boucle serrée par tâche

1. **Cadrer** en une phrase : entrée → sortie attendue → comment je vérifie.
2. **Agir** : écrire/éditer le code, créer les fichiers, lancer les commandes.
3. **Vérifier** immédiatement avec une commande réelle (voir gates ci-dessous).
4. **Corriger** si rouge — diagnostiquer la cause racine, pas masquer (`[[06-error-handling]]`).
5. **Réduire** : une fois vert, faire la **passe d'économie de code** — supprimer l'inutile,
   factoriser une duplication réelle, raccourcir sans nuire à la lisibilité (`[[00-development-philosophy]]` §Économie de code).
6. **Consigner** : `PROJECT_STATE.md` (avancement), `DECISION_LOG.md` (décision).
7. Passer à la tâche suivante. **Ne pas empiler** du code non vérifié.

## Efficacité des outils (économie de temps et de contexte)

- **Paralléliser** les actions indépendantes (lectures multiples, recherches) dans un même tour.
- **Lire avant d'éditer** ; éditer de façon ciblée plutôt que réécrire un fichier entier.
- **Chercher** (grep/glob) plutôt que supposer où se trouve le code.
- **Chargement progressif** : uniquement le fichier de rôle de la phase en cours + `common/` utiles.
- Ne pas re-dériver un fait déjà établi dans la session ; ne pas re-relire un fichier qu'on vient d'éditer.
- Ne pas relancer un serveur/watch en tâche de fond « pour voir » ; interroger l'état, pas dormir.

## Gates de vérification (exécutables, jamais « supposés verts »)

| Gate            | Commande (web)                        | Passe si                          |
|-----------------|---------------------------------------|-----------------------------------|
| Lint / format   | `npm run lint`                        | 0 erreur, warnings justifiés      |
| Types           | `npm run typecheck`                   | 0 erreur                          |
| Tests           | `npm test -- --run`                   | tous verts                        |
| Build prod      | `npm run build`                       | build OK                          |
| Image prod      | `docker build .` puis `npm run up:prod` | image OK, `/api/health` répond (port 3001) |
| Sécurité deps   | `npm audit --audit-level=high`        | 0 vuln high non justifiée         |
| Secrets         | `docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --no-banner` | aucun secret détecté |
| RLS/Supabase    | advisors sécurité après migration     | aucune alerte non justifiée       |

> **Régle d'or** : ne jamais écrire « fait / done / ça marche » sans avoir lancé la commande
> correspondante et vu le résultat. Si un gate est rouge, le dire avec la sortie exacte.

## Honnêteté d'exécution

- Rapporter fidèlement : si un test échoue, le montrer ; si une étape a été sautée, le dire.
- Pas de `TODO`/`any`/`@ts-ignore`/test skippé laissé silencieusement pour « faire passer ».
- Pas de faux positif : un code qui compile n'est pas un code qui marche — vérifier le comportement.

## Anti-patterns à éviter

- Décrire un plan à la place de livrer, quand la tâche est décidable et exécutable.
- Marquer « done » sans preuve ; supposer qu'un test/build passe.
- Sur-ingénierie « au cas où » ; abstraction prématurée (`[[00-development-philosophy]]`).
- Éditer à l'aveugle sans lire le fichier ; réécrire tout un fichier pour un changement local.
- Bloquer le projet sur un détail décidable (voir Question Gate, `[[09-ai-working-rules]]`).
