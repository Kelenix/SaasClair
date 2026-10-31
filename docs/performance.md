# Performance

> Budgets, mesures et optimisations. Mesures prises sur l'image de production locale (port 3001).

## Budgets (CLAUDE.md §3 et rôle Performance)

| Indicateur | Budget (P75, mobile) |
|------------|----------------------|
| LCP (plus grand élément affiché) | < 2,5 s |
| CLS (décalages de mise en page) | < 0,1 |
| INP (réactivité) | < 200 ms |

## Mesures (2026-10-30)

| Page | Mesure | Avant | Après |
|------|--------|-------|-------|
| Site vitrine, ordinateur (Lighthouse) | Score de performance | — | **93** |
| Site vitrine, ordinateur (Lighthouse) | LCP / CLS / blocage | — | **1,5 s / 0 / 100 ms** |
| Site vitrine, mobile (processeur ralenti ×4, mesure réelle) | Affichage du titre (LCP) | 3,6 s | **2,0 s** |
| Connexion, mobile (processeur ralenti ×4, mesure réelle) | Affichage du titre (LCP) | — | **0,9 s** |
| Toutes les pages (Lighthouse) | Accessibilité · bonnes pratiques · SEO | — | **100 · 96 à 100 · 100** |
| Toutes les pages (Lighthouse) | CLS | — | **0 à 0,07** |

**Limite de ces mesures.** Les scores Lighthouse mobiles de ce poste ne sont pas fiables : l'indice processeur varie de 700 à 1 800 d'une exécution à l'autre, et un autre projet Supabase tourne en parallèle. Même le premier affichage, du HTML servi par le serveur, y prend de 1 s à 7 s. **À remesurer** avec PageSpeed Insights sur le serveur de production (incrément 9).

## Optimisations appliquées

- **Entrées en CSS sur les pages d'arrivée** : le titre du site vitrine et les pages de connexion n'attendent plus le JavaScript pour apparaître (avant, opacité 0 jusqu'à l'hydratation).
- **Animations différées** : la maquette du tableau de bord du hero et le téléphone flottant ne s'animent qu'en entrant à l'écran (sur mobile, ils sont sous la ligne de flottaison).
- **Composants serveur** pour toutes les sections statiques du site vitrine. Seuls la navigation, le champ d'adresse, la maquette animée, les tarifs et la section « 2 clics » sont des composants client.
- **Animations** limitées à la transformation et à l'opacité, gérées par la carte graphique. La pulsation des badges n'utilise plus que l'échelle.
- **Écrans du tableau de bord** : rendus à la demande et dans des Suspense avec squelettes. Graphiques maison en SVG et HTML, sans bibliothèque de graphiques (ADR-016).
- **Polices** via `next/font` (auto-hébergées, `display: swap`), **logos** via `next/image`.

## Pistes restantes, à mesurer en production d'abord

- Le premier script (environ 224 Ko non compressés, 71 Ko compressés) est le socle React et Next.js : incompressible.
- Préchargement partiel des liens (`partialPrefetching`) : environ 180 Ko de données préchargées sur le site vitrine. À surveiller si le réseau mobile pèse.
- **Compression Brotli et cache** : rôle de Nginx et de Cloudflare au déploiement (incrément 9).
