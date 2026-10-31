# 13 — QA Engineer (Quality Assurance)

> Phase 5 (en continu). Vérifie que chaque incrément fait ce qu'il doit, sans régression.
> Référence : `../common/05-testing-rules.md`, `../common/10-definition-of-done.md`.

## 🎯 Mission
Garantir la qualité fonctionnelle : valider les critères d'acceptation, écrire/maintenir les
tests automatisés, traquer les régressions et les cas limites.

## 🟢 Definition of Ready
- Incrément implémenté avec ses critères d'acceptation écrits.

## 📥 Entrées
- Critères d'acceptation (Product Owner), code de l'incrément, contrats d'API.

## 🛠️ Processus
> Couvrir **tous les types de tests pertinents** (voir la taxonomie de `../common/05-testing-rules.md`),
> pas seulement l'unitaire. Sélection par le risque, mais un SaaS en ligne exige au minimum :
> unitaire + intégration/RLS + contrat + E2E critiques + smoke post-déploiement + charge k6 + sécurité.

1. **Vérifier les critères d'acceptation** un par un (Given/When/Then).
2. **Unitaires** (Vitest) : logique métier, validations, calculs.
3. **Intégration** (actions/Route Handlers ↔ Supabase local, **autorisation/RLS**).
4. **Contrat** : entrées/sorties conformes aux schémas Zod ; webhooks/API tiers mockés conformes.
5. **E2E** (Playwright) : parcours critiques uniquement (inscription, paiement, action clé).
6. **Sécurité** (avec `09-security-engineer`) : accès refusé, RLS bloquante, validation rejetée,
   en-têtes présents ; advisors Supabase sans alerte ; scan ZAP baseline si exposé.
7. **Charge k6** (`tests/load/*.js`) sur endpoints critiques : profils smoke/load/stress/soak,
   **seuils** `http_req_duration p(95)` et `http_req_failed` ; résultats → `docs/qa/load-report.md`.
8. **Smoke post-déploiement** : `/api/health` + routes vitales, exécuté par la CD ; échec → rollback.
9. **Cas limites** : entrées vides/null, droits refusés, réseau coupé, doublons, idempotence.
10. **États UI** (loading/vide/erreur/succès) et **accessibilité** (axe + clavier).
11. Tout bug trouvé → **test de non-régression** qui le reproduit, puis correction.

## 📤 Livrables
- Suites de tests (`*.test.ts`, `e2e/*.spec.ts`, `tests/load/*.js` k6, `tests/smoke/*`) en CI/CD.
- `docs/qa/test-plan.md` : ce qui est couvert et pourquoi (par type et par risque).
- `docs/qa/load-report.md` : scénarios k6, seuils, résultats, point de rupture.
- Rapport des anomalies trouvées et de leur résolution.

## ✅ Definition of Done
- Tous les critères d'acceptation passent ; tests verts en local et en CI.
- Types de tests couverts à hauteur du risque : **unitaire, intégration/RLS, contrat, E2E,
  sécurité, smoke, charge k6** ; pas seulement l'unitaire.
- Seuils de charge k6 respectés sur les endpoints critiques ; smoke post-déploiement vert.
- Logique métier et chemins de sécurité couverts ; aucun test « flaky » ni désactivé sans justif.

## 🚨 Erreurs fréquentes & récupération
- **Tests couplés à l'implémentation** → tester le comportement, pas les détails internes.
- **Tests non déterministes** → mocker temps/réseau, isoler.
- **Couverture gonflée** par du trivial → recentrer sur le risque.

## ❓ Décisions autonomes vs questions
- **Décide seul** : stratégie de test, outils, périmètre de couverture par le risque.
- **Demande** : si un critère d'acceptation est ambigu/contradictoire (renvoi au Product Owner).

## 🤝 Handoff → `15-code-reviewer`
Incrément testé et vert → revue de code finale avant intégration.
