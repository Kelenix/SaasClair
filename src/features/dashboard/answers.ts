// Réponses de la barre de question en démonstration. Elles seront rédigées par le moteur d'insights
// à partir des chiffres agrégés (jamais de donnée personnelle envoyée au modèle de langage, .docx §8).

export type Answer = { title: string; paragraphs: string[]; basis: string };

const ANSWERS: { pattern: RegExp; answer: Answer }[] = [
  {
    pattern: /inscri|sign|compte/i,
    answer: {
      title: "Vos inscriptions ont baissé de 12 % en 14 jours.",
      paragraphs: [
        "La baisse vient presque entièrement d'Instagram : −38 % de visiteurs depuis la pause de votre campagne du 14 octobre.",
        "Recherche Google et LinkedIn progressent (+6 % et +9 %). Sans Instagram, vos inscriptions seraient en hausse.",
        "À faire : relancer la campagne Instagram seulement si son coût par client payant reste sous 120 €.",
      ],
      basis: "18 400 visites et 1 290 inscriptions sur 30 jours",
    },
  },
  {
    pattern: /churn|part|résili|perd|quitt|risque/i,
    answer: {
      title: "Votre churn baisse : 7,0 % ce mois-ci, contre 7,6 % le mois dernier.",
      paragraphs: [
        "4 clients restent à fort risque, pour 1 750 € de revenu mensuel. Deux n'utilisent presque plus le produit, deux ont une carte bancaire expirée.",
        "Les clients qui partent ont un point commun : ils n'ont jamais utilisé la fonction Planning pendant leur premier mois.",
        "À faire : relancer les 4 clients cette semaine, et montrer Planning dès l'inscription.",
      ],
      basis: "historique de 340 clients sur 12 mois",
    },
  },
  {
    pattern: /canal|canaux|vien|source|acquisition|google|linkedin|instagram|seo/i,
    answer: {
      title: "La recherche Google vous rapporte le plus : 9 800 € par mois.",
      paragraphs: [
        "Viennent ensuite LinkedIn (6 200 €) et les accès directs (4 100 €). Instagram apporte beaucoup de visites mais peu de clients (1 800 €).",
        "Les clients venus de LinkedIn sont aussi les plus fidèles : 3 % de churn, contre 9 % pour Instagram.",
      ],
      basis: "91 % de vos clients reliés à leur provenance",
    },
  },
  {
    pattern: /revenu|mrr|chiffre|argent|€|euro/i,
    answer: {
      title: "Votre revenu mensuel atteint 25 000 €, +4,2 % en 30 jours.",
      paragraphs: [
        "Ce mois-ci : 2 600 € de nouveaux clients, 650 € d'offres plus élevées, et 1 750 € perdus avec les départs.",
        "Récupérer les paiements échoués rapporterait 450 € de plus dès ce mois.",
      ],
      basis: "paiements Stripe des 12 derniers mois",
    },
  },
  {
    pattern: /conver|essai|pai|achat|achèt|tunnel/i,
    answer: {
      title: "18,4 % de vos essais deviennent des clients payants.",
      paragraphs: [
        "C'est en hausse sur ordinateur, mais en baisse sur mobile : 63 % des abandons ont lieu sur la page de paiement mobile.",
        "À faire : vérifier le formulaire de paiement sur mobile et activer Apple Pay et Google Pay.",
      ],
      basis: "410 essais sur 30 jours",
    },
  },
];

export const SUGGESTED_QUESTIONS = [
  "Pourquoi mes inscriptions ont baissé ?",
  "Qui risque de partir ce mois-ci ?",
  "Quel canal me rapporte le plus ?",
];

export function answerQuestion(question: string): Answer {
  return (
    ANSWERS.find(({ pattern }) => pattern.test(question))?.answer ?? {
      title: "Je n'ai pas encore de réponse précise à cette question.",
      paragraphs: [
        "Je réponds aujourd'hui sur vos inscriptions, vos canaux, votre conversion, votre revenu et vos clients à risque.",
        "Essayez par exemple : « Pourquoi mes inscriptions ont baissé ? »",
      ],
      basis: "vos données des 12 derniers mois",
    }
  );
}
