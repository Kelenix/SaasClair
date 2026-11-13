// Réponses de la barre de question sur les vraies données (fonctions pures, testées) : on repère
// le sujet de la question, puis on répond avec les chiffres du compte. Rien n'est envoyé à un
// service extérieur, et rien n'est inventé : sans données sur le sujet, on dit ce qui manque.

import type { Answer } from "@/features/dashboard/answers";
import { formatEuro, formatPercent } from "@/lib/format";
import { listNames, type InsightFacts, type RealInsight } from "./engine";

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count > 1 ? many : word}`;

const NEEDS_STRIPE: Answer = {
  title: "Pour répondre, il me faut vos paiements.",
  paragraphs: [
    "Connectez Stripe en un clic depuis la configuration : je lirai vos clients, abonnements et factures, sans jamais rien modifier.",
  ],
  basis: "Stripe pas encore connecté",
};

const NEEDS_SCRIPT: Answer = {
  title: "Pour répondre, il me faut vos visites.",
  paragraphs: [
    "Installez la ligne SaasClair sur votre site, une seule fois : je saurai d'où viennent vos visiteurs.",
  ],
  basis: "Aucune visite reçue sur 30 jours",
};

function churnAnswer({ revenue }: InsightFacts, insights: RealInsight[]): Answer {
  if (!revenue) return NEEDS_STRIPE;
  const trend =
    revenue.customerChurn > revenue.previous.customerChurn
      ? "en hausse"
      : revenue.customerChurn < revenue.previous.customerChurn
        ? "en baisse"
        : "stable";
  const paragraphs: string[] = [];
  if (revenue.atRisk.length) {
    paragraphs.push(
      `${plural(revenue.atRisk.length, "client est", "clients sont")} à surveiller, pour ${formatEuro(revenue.mrrAtRisk)} de revenu mensuel : ${listNames(revenue.atRisk.map((risk) => risk.name))}.`,
    );
  } else {
    paragraphs.push("Aucun client à risque aujourd'hui : ni départ programmé, ni paiement échoué.");
  }
  if (revenue.lostCustomerNames.length) {
    paragraphs.push(
      `Partis ces 30 derniers jours : ${listNames(revenue.lostCustomerNames)} (${formatEuro(revenue.churnedMrr)} par mois).`,
    );
  }
  const action = insights.find((insight) => insight.area === "Rétention");
  if (action) paragraphs.push(`À faire : ${action.action}`);
  return {
    title: `Votre churn est de ${formatPercent(revenue.customerChurn)} par mois, ${trend} (${formatPercent(revenue.previous.customerChurn)} le mois d'avant).`,
    paragraphs,
    basis: `${plural(revenue.previous.customersAtStart, "client payant")} le mois d'avant, abonnements Stripe`,
  };
}

function revenueAnswer({ revenue }: InsightFacts): Answer {
  if (!revenue) return NEEDS_STRIPE;
  const paragraphs = [
    `Sur 30 jours : ${formatEuro(revenue.newMrr)} de nouveaux abonnements et ${formatEuro(revenue.churnedMrr)} perdus avec les départs.`,
  ];
  if (revenue.failedAmount) {
    paragraphs.push(
      `${formatEuro(revenue.failedAmount)} de paiements échoués restent à récupérer : c'est l'argent le plus facile à gagner ce mois-ci.`,
    );
  }
  if (revenue.trialing) {
    paragraphs.push(`${plural(revenue.trialing, "essai est", "essais sont")} en cours.`);
  }
  return {
    title: `Votre revenu mensuel récurrent est de ${formatEuro(revenue.mrr)}.`,
    paragraphs,
    basis: `${plural(revenue.activeSubscriptions, "abonnement payant")} dans Stripe`,
  };
}

function channelAnswer({ visits }: InsightFacts): Answer {
  if (!visits || visits.visitors === 0) return NEEDS_SCRIPT;
  const [top, ...others] = visits.channels;
  const paragraphs = others.length
    ? [
        `Viennent ensuite ${listNames(others.slice(0, 3).map((channel) => `${channel.name} (${formatPercent(channel.share)})`))}.`,
      ]
    : [];
  paragraphs.push(
    "Le revenu par canal s'affichera dès que vos visiteurs seront reliés à vos clients Stripe.",
  );
  return {
    title: `« ${top.name} » vous amène le plus de visiteurs : ${formatPercent(top.share)}.`,
    paragraphs,
    basis: `${plural(visits.visitors, "visiteur")} sur 30 jours`,
  };
}

function conversionAnswer({ revenue, audit }: InsightFacts, insights: RealInsight[]): Answer {
  const paragraphs: string[] = [];
  if (revenue?.trialsEnding.length) {
    paragraphs.push(
      `${plural(revenue.trialsEnding.length, "essai se termine", "essais se terminent")} dans les 7 jours : ${listNames(revenue.trialsEnding.map((trial) => trial.name))}.`,
    );
  }
  const site = insights.filter(
    (insight) => insight.area === "Conversion" && insight.id.startsWith("site-"),
  );
  for (const insight of site.slice(0, 2)) paragraphs.push(`${insight.title} ${insight.action}`);
  if (!paragraphs.length && !revenue && !audit) return NEEDS_STRIPE;
  return {
    title: paragraphs.length
      ? "Voici ce qui freine vos conversions aujourd'hui."
      : "Rien ne freine vos conversions d'après vos données actuelles.",
    paragraphs: paragraphs.length
      ? paragraphs
      : [
          "Le tunnel complet (visite, inscription, paiement) se précisera avec vos prochaines visites.",
        ],
    basis: "essais Stripe et analyse de votre site",
  };
}

const TOPICS: {
  pattern: RegExp;
  answer: (facts: InsightFacts, insights: RealInsight[]) => Answer;
}[] = [
  { pattern: /churn|part|résili|resili|perd|quitt|risque|garder|retenir/i, answer: churnAnswer },
  {
    pattern: /canal|canaux|vien|source|acquisition|google|linkedin|instagram|seo|visit/i,
    answer: channelAnswer,
  },
  { pattern: /revenu|mrr|chiffre|argent|€|euro|gagn|paiement/i, answer: revenueAnswer },
  { pattern: /conver|essai|achat|achèt|tunnel|inscri|sign|abandon/i, answer: conversionAnswer },
];

/** Réponse rédigée à partir des chiffres réels du compte. */
export function answerFromFacts(
  question: string,
  facts: InsightFacts,
  insights: RealInsight[],
): Answer {
  const topic = TOPICS.find(({ pattern }) => pattern.test(question));
  if (topic) return topic.answer(facts, insights);
  const [first] = insights;
  return first
    ? {
        title: first.title,
        paragraphs: [
          `C'est votre priorité du moment. ${first.finding}`,
          `À faire : ${first.action}`,
          "Je réponds aussi sur votre churn, votre revenu, vos canaux et vos conversions.",
        ],
        basis: first.basis,
      }
    : {
        title: "Je n'ai pas de réponse précise à cette question.",
        paragraphs: [
          "Je réponds sur votre churn, votre revenu, vos canaux et vos conversions, à partir de vos données.",
          "Essayez par exemple : « Qui risque de partir ce mois-ci ? »",
        ],
        basis: "vos données des 30 derniers jours",
      };
}
