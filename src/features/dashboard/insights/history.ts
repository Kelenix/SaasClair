// Historique des insights : ceux de la semaine (actionnables) et les précédents, avec l'impact
// mesuré 14 jours après action. Démonstration : l'historique ancien est figé.

import type { InsightStatus } from "../context";
import { INSIGHTS, type Insight } from "../demo-data";

export type InsightEntry = Insight & {
  week: string;
  /** Insight de la semaine : l'utilisateur peut encore le marquer fait ou ignoré. */
  isCurrent: boolean;
  status: InsightStatus | null;
  /** Revenu mensuel mesuré après action ; null = mesure en cours. */
  measured: number | null;
};

type PastInsight = Insight & {
  week: string;
  status: InsightStatus;
  measured?: number;
};

const CURRENT_WEEK = "Semaine du 26 octobre";

const PAST: PastInsight[] = [
  {
    id: "2026-43-annuel",
    week: "Semaine du 19 octobre",
    area: "Rétention",
    title: "Vos clients à l'année partent 4 fois moins.",
    finding: "2 % de churn chez les clients annuels, contre 8 % chez les mensuels.",
    cause: "Ils s'engagent après avoir invité leur équipe : l'outil devient un réflexe.",
    action: "Proposez l'offre annuelle à la fin de l'essai, avec 2 mois offerts.",
    impact: "+250 à 350 € par mois",
    impactEuros: 300,
    confidence: "élevée",
    basis: "historique de 340 clients",
    status: "done",
    measured: 310,
  },
  {
    id: "2026-43-tarifs-mobile",
    week: "Semaine du 19 octobre",
    area: "Conversion",
    title: "La page Tarifs perd 38 % des visiteurs mobiles.",
    finding: "Le tableau comparatif dépasse de l'écran sur téléphone.",
    cause: "Les visiteurs ne voient pas l'offre Growth et quittent la page.",
    action: "Empilez les offres sur mobile et mettez Growth en premier.",
    impact: "+3 à 5 clients par mois",
    impactEuros: 280,
    confidence: "élevée",
    basis: "2 100 visites mobiles",
    status: "done",
    measured: 290,
  },
  {
    id: "2026-42-planning",
    week: "Semaine du 12 octobre",
    area: "Rétention",
    title: "3 clients n'ont jamais ouvert le Planning.",
    finding:
      "Ce sont 3 des 5 clients partis le mois dernier qui n'avaient pas activé cette fonction.",
    cause: "Le Planning n'apparaît qu'au 3ᵉ écran de la prise en main.",
    action: "Envoyez-leur le guide Planning de 5 minutes et proposez un appel.",
    impact: "Jusqu'à 640 € par mois gardés",
    impactEuros: 640,
    confidence: "moyenne",
    basis: "112 départs analysés",
    status: "done",
    measured: 640,
  },
  {
    id: "2026-42-mardi",
    week: "Semaine du 12 octobre",
    area: "Acquisition",
    title: "Les inscrits du mardi deviennent plus souvent clients.",
    finding: "26 % d'entre eux paient après l'essai, contre 18 % en moyenne.",
    cause: "Ils arrivent par votre newsletter, envoyée le mardi matin.",
    action: "Publiez vos articles le mardi, juste avant la newsletter.",
    impact: "+2 clients par mois",
    impactEuros: 150,
    confidence: "moyenne",
    basis: "4 mois d'inscriptions",
    status: "ignored",
  },
  {
    id: "2026-41-bienvenue",
    week: "Semaine du 5 octobre",
    area: "Conversion",
    title: "Votre email de bienvenue n'est presque pas ouvert.",
    finding: "14 % d'ouverture, contre 45 % habituellement pour ce type d'email.",
    cause: "Il part d'une adresse « noreply » et son objet ressemble à une facture.",
    action: "Envoyez-le depuis votre prénom, avec un objet qui annonce un bénéfice.",
    impact: "+150 à 200 € par mois",
    impactEuros: 180,
    confidence: "moyenne",
    basis: "620 inscriptions",
    status: "done",
    measured: 180,
  },
  {
    id: "2026-41-instagram",
    week: "Semaine du 5 octobre",
    area: "Acquisition",
    title: "Instagram amène beaucoup de visites, mais peu de clients.",
    finding: "13 % des visites, 7 % du revenu, et le churn le plus élevé (9 %).",
    cause: "Les publicités ciblent des indépendants, alors que votre offre vise des équipes.",
    action: "Ciblez les responsables d'équipe de 10 à 50 personnes.",
    impact: "+200 € par mois",
    impactEuros: 200,
    confidence: "moyenne",
    basis: "2 400 visites Instagram",
    status: "ignored",
  },
  {
    id: "2026-40-cartes",
    week: "Semaine du 28 septembre",
    area: "Rétention",
    title: "5 cartes bancaires expirent ce mois-ci.",
    finding: "520 € de revenu mensuel risquent de partir sans que personne ne le décide.",
    cause: "Aucun rappel n'est envoyé avant l'expiration de la carte.",
    action: "Activez les rappels de carte de Stripe, 7 jours avant l'échéance.",
    impact: "Jusqu'à 520 € par mois gardés",
    impactEuros: 520,
    confidence: "élevée",
    basis: "5 cartes concernées",
    status: "done",
    measured: 520,
  },
  {
    id: "2026-40-guide",
    week: "Semaine du 28 septembre",
    area: "Acquisition",
    title: "Votre guide du planning attire des visiteurs qualifiés.",
    finding: "15 clients sont venus de cet article en 30 jours.",
    cause: "Il répond précisément à la recherche « planning équipe hybride ».",
    action: "Ajoutez un bouton d'essai gratuit au milieu de l'article.",
    impact: "+2 à 3 clients par mois",
    impactEuros: 200,
    confidence: "moyenne",
    basis: "3 900 visites de l'article",
    status: "done",
    measured: 0,
  },
  {
    id: "2026-39-essai",
    week: "Semaine du 21 septembre",
    area: "Conversion",
    title: "L'essai de 14 jours est court pour les équipes.",
    finding: "Les équipes de plus de 10 personnes paient en moyenne au 19ᵉ jour.",
    cause: "Elles doivent faire valider l'achat avant de s'abonner.",
    action: "Proposez une prolongation de 7 jours en un clic aux équipes.",
    impact: "+3 clients par mois",
    impactEuros: 240,
    confidence: "moyenne",
    basis: "48 équipes en essai",
    status: "ignored",
  },
];

/** Tous les insights, du plus récent au plus ancien, avec leur statut et l'impact mesuré. */
export function getInsightHistory(feedback: Record<string, InsightStatus>): InsightEntry[] {
  return [
    ...INSIGHTS.map((insight) => ({
      ...insight,
      week: CURRENT_WEEK,
      isCurrent: true,
      status: feedback[insight.id] ?? null,
      measured: null,
    })),
    ...PAST.map(({ status, measured, ...insight }) => ({
      ...insight,
      isCurrent: false,
      status,
      measured: measured ?? null,
    })),
  ];
}

export function summarize(entries: InsightEntry[]) {
  const done = entries.filter((entry) => entry.status === "done");
  return {
    total: entries.length,
    done: done.length,
    ignored: entries.filter((entry) => entry.status === "ignored").length,
    pending: entries.filter((entry) => entry.status === null).length,
    measured: done.reduce((sum, entry) => sum + (entry.measured ?? 0), 0),
    measuring: done.filter((entry) => entry.measured === null).length,
  };
}
