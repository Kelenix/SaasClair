# Plan de test

> Ce qui est couvert, pourquoi, et comment le lancer. Mis à jour à l'incrément 8.

## Vue d'ensemble

| Type | Outil | Où | Lancement | En CI |
|------|-------|----|-----------|-------|
| Unitaires et composants | Vitest + Testing Library | `src/**/*.test.ts(x)` | `npm test -- --run` | oui |
| Contrastes des couleurs | Vitest | `src/design-tokens.test.ts` | idem | oui |
| Bout en bout | Playwright | `e2e/*.spec.ts` | `npm run up:prod` puis `npm run test:e2e` | oui (job `e2e`) |
| Accessibilité automatique | axe-core (WCAG 2.1 A et AA) | `e2e/accessibility.spec.ts` | idem | oui |
| Isolation des données (RLS) | SQL avec un second compte | manuel, consigné dans `docs/security.md` | — | non |
| Charge (k6) | — | à faire avec le déploiement (incrément 9) | — | non |

## Unitaires (109 tests)

- **Données de démonstration** : cohérence entre écrans. Le revenu retombe sur 25 000 €, le taux essai → payant est le même sur l'accueil et le tunnel, la croissance concorde avec le graphique, il y a 12 mois distincts sur 12 mois, et les cohortes ne font que baisser.
- **Validation** : schémas d'inscription et de connexion, adresse de site, webhook Slack (refus des imitations comme `hooks.slack.com.evil.fr`), alertes inconnues refusées.
- **Sécurité** : redirections ouvertes refusées et garde anti-SSRF de l'audit d'URL.
- **Composants** :
  - compteurs, mini-courbes et jauges ;
  - formulaire d'adresse du site vitrine ;
  - choix en pilules (`aria-pressed`).

## Bout en bout (35 tests, ordinateur et mobile 360 px)

| Fichier | Ce qui est vérifié |
|---------|--------------------|
| `journey.spec.ts` | Site vitrine (adresse saisie) → inscription → configuration : audit réel d'`example.com`, script copié et détecté, Stripe connecté → « C'est terminé » → tableau de bord « Bonjour Camille. ». Une connexion suivante ne repasse plus par la configuration. |
| `accessibility.spec.ts` | 4 pages publiques et 7 écrans du tableau de bord : aucune violation axe (WCAG 2.1 AA) et aucun débordement horizontal, sur ordinateur et à 360 px. |
| `security.spec.ts` | Formulaires de compte en POST (non-régression), pages privées redirigées vers la connexion, en-têtes de sécurité présents. |
| `responsive.spec.ts` | Focus visible au clavier, chiffres affichés immédiatement avec « réduire les animations », écrans sans débordement. |

Notes :

- **Cible** : l'image de production locale (port 3001), parce que le mode développement compile trop lentement pour des tests fiables. Une autre cible se choisit avec `BASE_URL`.
- **Compte utilisé** : celui de démonstration (`supabase/seed.sql`). Le parcours crée en plus un compte `parcours-…@test.saasclair.fr` à chaque exécution ; `npm run db:reset` nettoie la base locale.

## Anomalies trouvées et corrigées à l'incrément 8

| Anomalie | Gravité | Correction | Test de non-régression |
|----------|---------|------------|------------------------|
| Un envoi du formulaire de connexion parti avant que React ne l'intercepte se faisait en GET, avec le mot de passe dans l'adresse | Élevée (sécurité) | `method="post"` sur les 4 formulaires de compte | `security.spec.ts` |
| Un utilisateur déjà configuré retombait sur « C'est terminé » à chaque connexion | Moyenne (parcours) | `/configuration` redirige vers `/app` une fois la configuration finie | `journey.spec.ts` |
| Boutons sans nom pour les lecteurs d'écran pendant le chargement | Moyenne (accessibilité) | Texte « Envoi en cours… » / « Analyse en cours… » | `accessibility.spec.ts` |
| Contrastes insuffisants : barre latérale, panneau de connexion, pied de page, aperçu du site vitrine, badges or qui pulsent (baisse d'opacité) | Moyenne (accessibilité) | Opacités relevées ; la pulsation n'utilise plus que l'échelle | `accessibility.spec.ts` |
| Zones qui défilent horizontalement (graphiques, cohortes, ligne de script) inaccessibles au clavier sur mobile | Moyenne (accessibilité) | Zones focusables et nommées | `accessibility.spec.ts` (mobile) |
| Pages de connexion invisibles tant que le JavaScript n'est pas chargé, et titre du site vitrine affiché tardivement | Moyenne (performance) | Entrées animées en CSS | mesure LCP, `docs/performance.md` |

## Non couvert (et pourquoi)

- **Connexion Google et GitHub** : elle attend les clés OAuth (tâches manuelles n° 3 et 4).
- **Emails réels** (confirmation, mot de passe oublié) : il faut un service d'envoi en production.
- **Charge k6 et test après déploiement** : à faire avec la mise en production (incrément 9).
- **Lecteurs d'écran réels** (NVDA, VoiceOver) : axe couvre les règles automatiques, pas l'expérience complète.
