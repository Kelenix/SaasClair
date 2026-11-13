// Textes du site vitrine (ton : clair, direct, rassurant — aucun jargon).

import { MONTHLY_PRICE } from "@/features/billing/plans";

export const NAV_LINKS = [
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#tarifs", label: "Tarifs" },
] as const;

export const NADIA = {
  mrr: 25000,
  churnRate: 7,
  lostPerMonth: 1750,
  lostPerYear: 21000,
  savedIfOneInThree: 580,
} as const;

export const PROMISES = [
  {
    id: "acquisition",
    eyebrow: "Acquisition",
    title: "D'où viennent vos clients",
    text: "Chaque client payant est relié au canal qui l'a amené. Vous savez enfin où investir, en euros, pas en visites.",
    proof: "Le SEO vous rapporte 9 800 € par mois.",
  },
  {
    id: "conversion",
    eyebrow: "Conversion",
    title: "Pourquoi ils n'achètent pas",
    text: "Votre tunnel est construit tout seul. Vous voyez l'étape qui perd le plus de monde, et pourquoi.",
    proof: "63 % des abandons ont lieu sur la page de paiement mobile.",
  },
  {
    id: "churn",
    eyebrow: "Rétention",
    title: "Qui va partir",
    text: "Chaque client reçoit un score de risque, avec ses raisons. Vous agissez avant la résiliation, pas après.",
    proof: "3 clients à relancer cette semaine.",
  },
] as const;

export const SETUP_STEPS = [
  {
    title: "Collez une ligne de code",
    duration: "≈ 2 minutes",
    text: "Une ligne dans votre site, ou l'extension WordPress, Webflow ou Shopify. Rien d'autre à régler.",
    done: "Script installé",
  },
  {
    title: "Connectez Stripe",
    duration: "≈ 1 minute",
    text: "Un clic. SaasClair ne fait que lire : nous ne modifions jamais rien sur votre compte.",
    done: "Stripe connecté",
  },
  {
    title: "Lisez vos réponses",
    duration: "Tout de suite",
    text: "Canaux, tunnel, clients à risque : tout est calculé automatiquement. Vous n'avez plus rien à configurer.",
    done: "Tableau de bord prêt",
  },
] as const;

export const RETENTION_POINTS = [
  {
    title: "Prévenu 10 jours avant",
    text: "Connexions en baisse, carte qui expire, usage qui chute : vous êtes alerté avant le renouvellement.",
  },
  {
    title: "La raison, en une phrase",
    text: "« Pas de connexion depuis 18 jours. » Pas de graphique à décrypter.",
  },
  {
    title: "L'email de relance, prêt",
    text: "Un brouillon personnalisé pour chaque client à risque. Vous relisez, vous envoyez.",
  },
] as const;

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    pitch: "Pour comprendre son SaaS, seul.",
    monthly: MONTHLY_PRICE.starter,
    features: [
      "1 SaaS suivi",
      "Jusqu'à 50 000 visites par mois",
      "Connexion Stripe en un clic : nous lisons, sans jamais rien modifier",
      "3 recommandations chaque lundi",
      "Rapport hebdomadaire par email",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    pitch: "Pour une équipe qui veut agir vite.",
    monthly: MONTHLY_PRICE.growth,
    isRecommended: true,
    features: [
      "3 SaaS suivis",
      "Jusqu'à 200 000 visites par mois",
      "Alertes immédiates par email et Slack",
      "Tunnels personnalisés",
      "Jusqu'à 5 membres d'équipe",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pitch: "Pour les agences et les gros volumes.",
    monthly: MONTHLY_PRICE.pro,
    features: [
      "SaaS suivis illimités",
      "Rapports pour vos clients",
      "Marque blanche",
      "Accès API",
      "Accompagnement dédié",
    ],
  },
] as const;

// FAQ et témoignages : gérés depuis l'espace administrateur (tables faq_items et testimonials).
