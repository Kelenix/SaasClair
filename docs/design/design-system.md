# Système de design — SaasClair

> Source : `SaasClair_brand_kit.html`. Démonstration vivante : **http://localhost:3000/design**.
> Toutes les valeurs visuelles passent par les jetons de `src/app/globals.css` (aucune couleur en dur).

## Jetons

| Groupe | Jetons (classes Tailwind) | Règle |
|---|---|---|
| Marque | `forest`, `emerald`, `gold`, `cream` | Proportions par écran : crème 55 %, forêt 30 %, émeraude 10 %, or 5 % |
| Neutres | `ink` (texte), `slate` (texte secondaire), `line` (bordures), `sand`, `paper`, `white` | Cartes blanches sur fond crème |
| Texte accessible | `emerald-ink`, `gold-ink`, `forest-deep`, `danger` | Jamais d'émeraude ou d'or purs en texte sur fond clair (ADR-010) |
| Teintes | `emerald-tint`, `gold-tint`, `danger-tint` | Fonds de badges et d'états |
| Rayons | `rounded-card` (20 px), `rounded-panel` (24 px), `rounded-full` (boutons) | |
| Ombres | `shadow-card`, `shadow-lift` (survol), `shadow-float` (panneaux) | Douces, teintées de vert |
| Typo | `font-serif` (Fraunces 600 : titres, grands chiffres), `font-sans` (Inter), `tabular-nums`, utilitaire `eyebrow` | |
| Animation | `src/lib/motion.ts` + `--dur-*` / `--ease-*` | Micro 200 ms · écran 400 ms · données 900 ms · cascade 60 ms |

Les contrastes sont vérifiés par `src/design-tokens.test.ts` à chaque exécution des tests.

## Composants

| Composant | Fichier | Notes |
|---|---|---|
| `Logo` | `components/brand/logo.tsx` | `full` (fond clair), `inverse` (fond forêt), `mark` (monogramme) |
| `Icon` | `components/brand/icon.tsx` | Toute icône passe par lui : apparition, survol, clic (ADR-009) |
| `Button` | `components/ui/button.tsx` | `primary`, `secondary`, `positive`, `ghost`, `inverse`, `link` · tailles 44 / 48 / 56 px |
| `Card` | `components/ui/card.tsx` | `interactive` : se soulève au survol |
| `Badge` | `components/ui/badge.tsx` | `growth`, `attention` (or, `pulse` pour les clients à risque), `danger`, `neutral`, `brand` |
| `Input`, `Checkbox`, `Switch`, `Label` | `components/ui/*` | Hauteur 48 px, focus émeraude, `aria-invalid` |
| `Tabs`, `Accordion` | `components/ui/*` | Onglets pilule défilables sur mobile |
| `Sheet`, `Dialog` | `components/ui/*` | Glissent, fond qui s'assombrit ; `side="bottom"` pour les filtres mobiles |
| `Toaster` | `components/ui/sonner.tsx` | Pilule forêt, disparaît seule après 4 s |
| `Skeleton` | `components/ui/skeleton.tsx` | Brillance animée |
| `StateMessage` | `components/states/state-message.tsx` | États vide (`calm`) et erreur (`error`, annoncé aux lecteurs d'écran) |
| `Reveal`, `Cascade`, `CascadeItem` | `components/motion/reveal.tsx` | Apparition au défilement, cascade de 60 ms |
| `AnimatedNumber` | `components/data/animated-number.tsx` | Compteur 0 → valeur, formats euro / nombre / pourcentage |
| `Sparkline`, `BarChart`, `RiskMeter`, `LiveDot` | `components/data/*` | Courbe qui se trace, barres qui poussent, jauge, point « en direct » |

## Règles

- Animer uniquement position, échelle et opacité (exception : tracé des courbes SVG, demandé par le cahier des charges).
- « Réduire les animations » : Motion ne garde que les fondus (`MotionConfig`) ; les animations CSS sont coupées dans `globals.css`.
- Zones tactiles ≥ 44 px ; focus visible (contour émeraude foncé) partout.
- Grilles : toujours `grid-cols-1` sur mobile (sinon un contenu large, comme une ligne de code, élargit la page au-delà de 360 px).
- Barres et jauges : déclencher l'animation depuis le parent fixe (`growX` / `growY` de `lib/motion.ts`), jamais depuis l'élément à l'échelle 0, que le navigateur ne « voit » pas.
- Chaque écran prévoit ses 4 états : chargement (`Skeleton`), vide et erreur (`StateMessage`), succès (toast).
- Ton : chiffre d'abord, action ensuite, jamais alarmiste.
