# 05 — Règles de test

> Tester à hauteur du risque. Rôle pilote : `qa-engineer`. Référence : `[[10-definition-of-done]]`.

## Pyramide de tests

```
        /\        E2E (peu, parcours critiques)
       /  \       Intégration + Contrat (API, base, RLS, navigation)
      /____\      Unitaires (beaucoup, logique métier)
```

- **Unitaires** : logique pure, fonctions de service, validations, calculs. Rapides, isolés.
- **Intégration** : interaction entre couches (API ↔ DB, repository ↔ Supabase, navigation).
- **Contrat** : les entrées/sorties respectent les schémas (Zod) ; webhooks/API tiers mockés conformes.
- **E2E** : parcours utilisateur critiques uniquement (inscription, paiement, action clé).

## Types de tests pour un SaaS en ligne (au-delà de l'unitaire)

Un SaaS déployé exige plus que des tests unitaires. Sélectionner selon le risque, mais **ne pas
se limiter à l'unitaire** :

| Type | But | Outil (web) | Quand |
|------|-----|-------------|-------|
| **Unitaire** | logique/validation isolée | Vitest | à chaque incrément |
| **Intégration** | couches réelles (DB/RLS/API) | Vitest + Supabase local (Docker Desktop en dev, CI) | à chaque incrément |
| **Contrat** | conformité I/O aux schémas Zod / API tierces | Vitest + zod | endpoints & webhooks |
| **E2E** | parcours critiques bout en bout | Playwright | parcours clés |
| **Smoke** | l'app démarre et les routes vitales répondent (post-déploiement) | Playwright/curl sur `/api/health` + pages clés | après chaque déploiement (CD) |
| **Régression** | un bug corrigé ne revient pas | test reproduisant le bug | à chaque bug |
| **Sécurité** | accès refusé, RLS, authz, validation, en-têtes | Vitest + advisors Supabase + ZAP baseline | continu (voir `security-engineer`) |
| **Charge / montée en charge** | tenue sous trafic, seuils latence/erreurs | **k6** | avant mise en prod & sur endpoints critiques |
| **Accessibilité** | a11y automatisée + clavier | axe-core / Playwright | pages UI |
| **Visuel (option)** | pas de régression visuelle | Playwright screenshots | UI stable |

### Tests de charge avec k6 (obligatoire avant prod d'un SaaS)
- Écrire des scénarios `k6` (`tests/load/*.js`) sur les endpoints critiques (login, API métier).
- Définir des **seuils** (`thresholds`) : ex. `http_req_duration p(95)<500ms`, `http_req_failed<1%`.
- Profils : **smoke** (1-2 VUs, sanity), **load** (charge nominale), **stress** (au-delà, trouver
  le point de rupture), **soak** (durée, fuites mémoire). Lancer hors CI bloquante (job dédié /
  manuel) pour ne pas ralentir chaque PR ; documenter les résultats dans `docs/qa/load-report.md`.
- **Exécution sans installation, via Docker Desktop**, contre l'image de prod locale (`npm run up:prod`) :
  `Get-Content tests/load/load.js -Raw | docker run --rm -i -e BASE_URL=http://host.docker.internal:3001 grafana/k6:2.3.0 run -`
  (le script lit `__ENV.BASE_URL`). Ne jamais lancer stress/soak contre la prod sans accord : le VPS est partagé.
- **Scan sécurité (ZAP baseline)**, lui aussi via Docker :
  `docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:3001`.

### Smoke tests post-déploiement
- Après chaque déploiement (job CD), vérifier automatiquement `/api/health` + 2-3 routes vitales.
- Si le smoke échoue → **rollback automatique** (voir `12-devops-engineer`).

## Quoi tester en priorité (par le risque)

1. Logique métier et règles de calcul.
2. Sécurité : contrôle d'accès, policies RLS, validation des entrées.
3. Parcours critiques (ceux dont l'échec coûte de l'argent ou bloque l'utilisateur).
4. Cas limites et erreurs (entrées vides, null, réseau coupé, droits refusés).

## Ce qu'on ne teste pas

- Le code tiers (framework, lib) — on teste *notre* usage, pas la lib.
- Les getters/setters triviaux sans logique.

## Règles de qualité des tests

- Un test = un comportement. Nom explicite : `it('refuse l'accès si non authentifié')`.
- Pattern **AAA** : Arrange / Act / Assert.
- Tests **déterministes** (pas de dépendance à l'heure réelle, au réseau non mocké, à l'ordre).
- Données de test via factories, jamais des fixtures opaques copiées-collées.
- Un test qui échoue doit pointer clairement vers la cause.

## Couverture

- Cible : **couverture significative de la logique métier et des chemins de sécurité**, pas
  un pourcentage global gonflé par du code trivial.
- Indicateur, pas objectif : ne pas écrire de tests vides pour atteindre un chiffre.

## Intégration continue

- Tous les tests tournent en CI à chaque PR (voir `[[07-git-workflow]]`).
- Un merge est bloqué si les tests, le lint ou le typecheck échouent.
- Tout bug corrigé reçoit d'abord un **test de non-régression** qui reproduit le bug.
