# Plan de réalisation — SaasClair

> Phase 0 (cadrage). Mode : **plan puis validation**, puis livraison **écran par écran avec
> démonstration à chaque étape** (consigne de `CLAUDE.md`).

## 1. Compréhension du besoin

SaasClair est une application web d'analyse pour fondateurs de petits SaaS. Elle répond à trois
questions, **sans configuration** : d'où viennent mes clients payants, où mon tunnel fuit, qui
va partir. L'utilisateur ne fait que **deux actions** (coller un script, connecter Stripe) ;
tout le reste est automatique, et en cas de doute l'outil pose une question fermée en un clic.

**Cible** : Nadia — SaaS B2B, 25 000 € de MRR, 7 % de churn (≈ 1 750 €/mois perdus), ≈ 340 clients.

**Périmètre de cette version** (recommandé, voir Q1) : le **produit complet côté utilisateur**
(site vitrine → inscription → configuration → tableau de bord complet), fidèle au brand kit,
richement animé, responsive dès 360 px, avec :
- une **vraie authentification** (Supabase : email, Google, GitHub) et un vrai projet enregistré (URL, avancement de la configuration) protégé par RLS ;
- un **vrai mini-audit de l'URL** côté serveur (pages d'inscription / tarifs / paiement détectées, temps de réponse, balises SEO de base, technologies) ;
- des **données analytiques de démonstration** cohérentes sur tous les écrans (ADR-002) ;
- la vérification du script et la connexion Stripe **simulées de façon réaliste** (en attendant la collecte réelle).

**Hors périmètre de cette version** : collecte réelle (script < 5 Ko + ingestion), synchronisation
Stripe réelle, moteur d'insights IA, emails hebdomadaires, Slack, Paddle / Lemon Squeezy, anglais.
Session replay, cartes de chaleur et marque blanche restent exclus du produit (.docx « Won't »).

## 1 bis. Hypothèses (trous des sources, à corriger si besoin)

- **Langue** : français uniquement (l'anglais du .docx est reporté — ADR-005).
- **Accessibilité** : niveau WCAG 2.2 AA.
- **Budget services tiers** : 0 € pendant le développement (tout tourne en local sous Docker).
- **Équipe et rôles** (Paramètres) : affichés avec des données de démo ; un seul projet par compte (.docx F6).
- **Essai gratuit** : 14 jours (.docx F6).
- **VPS Hostinger, domaine, dépôt GitHub** : non fournis, nécessaires seulement à l'incrément 9.
- **Pages légales** (mentions, confidentialité, CGU) : gabarits signalés « à faire valider par un juriste ».

## 2. Architecture cible (résumé)

```
Navigateur ── Next.js 16 (App Router, RSC)
               ├─ (marketing)  site vitrine statique, SEO      ← rapide, indexable
               ├─ (auth)       connexion / inscription          ← Supabase Auth (email, Google, GitHub)
               ├─ onboarding   étapes 0 → 2 + écran final       ← action serveur « audit d'URL »
               └─ app          tableau de bord (routes chargées à la demande)
                                └─ lib/data  couche d'accès typée → générateur de démo (graine fixe)
Supabase (Postgres + RLS) : profiles, projects (url, étapes terminées, couverture), insight_actions
Docker Desktop : `npm run up` = Supabase local + Next.js en rechargement à chaud
```

Système de design : jetons du brand kit dans Tailwind 4 (`@theme`) — couleurs, rayons, ombres
teintées de vert, typos, **durées et courbes d'animation centralisées** (micro 150–250 ms,
écran 300–500 ms, données 600–1 200 ms, cascade 60 ms). Animations : Motion ; icônes : Lucide
animées ; graphiques : SVG animés + Recharts en différé (ADR-006).

## 3. Découpage en incréments (ordre de `CLAUDE.md` §6)

| # | Incrément | Contenu | Critères d'acceptation | Démo |
|---|-----------|---------|------------------------|------|
| 0 | **Socle** | Next.js, Tailwind, shadcn/ui, Docker (`npm run up`), CI (lint, types, tests, build), logos détourés + favicon | `npm run up` démarre l'app ; CI verte | — |
| 1 | **Système de design** | Jetons, Button, Card, Badge, Input, Tabs, Switch, Accordion, Toast, Sheet/Drawer, Skeleton, Counter animé, LiveDot, icônes animées, mini-graphiques ; page `/design` qui les montre tous | Fidèle au brand kit (comparaison côte à côte) ; clavier + focus ; reduced-motion | Page `/design` |
| 2 | **Site vitrine** | Nav + menu mobile, hero (champ URL + aperçu animé), 3 promesses, « 2 clics », churn de Nadia, témoignages, tarifs mensuel/annuel, FAQ, CTA, pied de page | Lighthouse ≥ 90 (perf, a11y, SEO) ; 360 px OK ; l'URL saisie est transmise à l'inscription | `/` |
| 3 | **Inscription & connexion** | Écran deux parties, panneau forêt animé, email + Google + GitHub, validation temps réel | Compte créé → arrivée en configuration ; erreurs claires | `/inscription`, `/connexion` |
| 4 | **Configuration** | Barre de progression, étape 0 (scan + vérifications + mini-audit, URL reprise), étape 1 (onglets plateformes, Copier, envoi au développeur, attente → succès), étape 2 (Stripe, import qui compte), écran final (particules) → tableau de bord en cascade ; lien « données de démonstration » | 2 actions obligatoires seulement ; < 5 min ; reprise possible après rechargement | `/configuration` |
| 5 | **Structure du tableau de bord + Accueil** | Barre latérale repliable / icônes (tablette) / barre basse (mobile), sélecteur de période, barre de question, notifications, bandeau de confirmation ; Accueil « Santé » (4 indicateurs, 3 insights, revenu, canaux, tunnel, clients à risque) | Utilisable à 360 px ; changement de période animé | `/app` |
| 6 | **Churn, Acquisition, Tunnel, Revenus** | Écrans complets, panneau client latéral, cohortes en carte de chaleur, tableaux → cartes sur mobile | Tous les chiffres cohérents entre écrans | `/app/churn`… |
| 7 | **Insights, alertes, paramètres** | Historique filtrable fait/ignoré, alertes, paramètres (projet, équipe, abonnement, confidentialité, intégrations facultatives, couverture 91 %) | États chargement / vide / erreur / succès partout | `/app/insights`, `/app/parametres` |
| 8 | **Qualité & optimisation** | Tests e2e du parcours complet, axe-core, Lighthouse, SEO (métadonnées, sitemap, OG), revue de code, passe de réduction | Gates verts (lint, types, tests, build, audit) | Rapport |
| 9 | **Mise en production** | Image Docker prod, VPS Hostinger (Compose + Nginx + TLS), déploiement auto sur `git push main` | `/api/health` répond en prod | URL publique |
| 10 | **Documentation** | README, guide utilisateur, tâches manuelles, passation maintenance | Un tiers lance le projet seul | — |

## 4. Séquence des phases et rôles

0 Cadrage (directeur) → 1 Produit (product owner) → 2 Plan (project manager) → 3 Architecture
(architecte, system design, base de données) + Design (UI/UX) → socle DevOps → 4 Implémentation
par incrément (frontend ⇄ backend, sécurité en continu) → 5 Qualité (QA + revue à chaque
incrément) → SEO + performance → 6 Production (DevOps + release) → 7 Documentation → 8 Maintenance.

## 5. Risques & parades

| Risque | Parade |
|--------|--------|
| Animations riches qui ralentissent sur mobile | Uniquement transform/opacity, `LazyMotion`, graphiques chargés en différé, mesure Lighthouse à chaque écran |
| Logos JPEG basse définition | Détourage soigné ; demander les SVG si disponibles (ADR-007) |
| Audit d'URL : sites lents, bloqués ou malveillants (SSRF) | Délai max 8 s, HTTPS public uniquement, IP privées refusées, taille limitée ; repli élégant « analyse partielle » |
| OAuth Google/GitHub nécessite des identifiants | Email fonctionne seul en local ; boutons Google/GitHub actifs dès que les clés sont fournies (tâche manuelle) |
| Confusion démo / réel | Badge discret « Données de démonstration » tant que la collecte réelle n'existe pas |

## 6. Tâches manuelles prévues (voir `docs/manual-tasks.md`)

Docker Desktop lancé · (facultatif) applications OAuth Google et GitHub · (phase 9) VPS
Hostinger, domaine, compte GitHub · (plus tard) compte Stripe Connect.

## 7. Questions

- ✅ **Q1 — Périmètre** : produit complet sur données de démo + vraie auth + vrai audit d'URL (ADR-002).
- ✅ **Q2 — Tarifs** : Starter 29 €/mois, Growth 79 €/mois, Pro sur devis, −20 % en annuel (ADR-008).
- Ouvert, plus tard (phase 9, non bloquant) : hébergement de Supabase en production (Supabase Cloud UE gratuit ou auto-hébergé sur le VPS), VPS, domaine.
