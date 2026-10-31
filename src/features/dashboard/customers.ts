// Clients de démonstration suivis par SaasClair (entreprises inventées) : liste de surveillance
// du churn et paiements échoués. Partagés par l'accueil, l'écran Churn et l'écran Revenus.

export type Signal = { label: string; detail: string };
export type TimelineEvent = {
  daysAgo: number;
  label: string;
  tone: "neutral" | "warning" | "positive";
};

export type WatchedCustomer = {
  id: string;
  name: string;
  initials: string;
  mrr: number;
  /** Score de risque de départ, de 0 à 100. */
  score: number;
  reasons: string[];
  renewsInDays: number;
  action: string;
  contact: { firstName: string; role: string };
  plan: string;
  since: string;
  seats: { active: number; total: number };
  /** Connexions par semaine sur les 12 dernières semaines. */
  usage: number[];
  signals: Signal[];
  timeline: TimelineEvent[];
  /** Phrase d'accroche de l'email de relance, propre à la situation du client. */
  emailHook: string;
};

/** À partir de ce score, le client « risque de partir » ; en dessous, il montre des premiers signes. */
export const HIGH_RISK_SCORE = 60;

export const WATCHLIST: WatchedCustomer[] = [
  {
    id: "lumen-bureau",
    name: "Lumen Bureau",
    initials: "LB",
    mrr: 420,
    score: 86,
    reasons: ["Pas de connexion depuis 18 jours", "2 utilisateurs actifs sur 9"],
    renewsInDays: 6,
    action: "Appeler la responsable",
    contact: { firstName: "Claire", role: "Responsable des opérations" },
    plan: "Offre Équipe · 9 places",
    since: "mars 2025",
    seats: { active: 2, total: 9 },
    usage: [41, 44, 39, 42, 37, 30, 22, 15, 9, 4, 1, 0],
    signals: [
      {
        label: "Pas de connexion depuis 18 jours",
        detail: "Elle se connectait 4 fois par semaine.",
      },
      { label: "2 utilisateurs actifs sur 9", detail: "7 places payées ne servent plus." },
      { label: "Renouvellement dans 6 jours", detail: "Prélèvement annuel prévu." },
    ],
    timeline: [
      { daysAgo: 18, label: "Dernière connexion de Claire", tone: "warning" },
      { daysAgo: 26, label: "Export complet de leurs plannings", tone: "warning" },
      { daysAgo: 41, label: "Ticket « Comment retirer des places ? »", tone: "neutral" },
      { daysAgo: 230, label: "Passage à l'offre Équipe", tone: "positive" },
    ],
    emailHook:
      "J'ai vu que l'équipe utilisait moins l'outil ces dernières semaines, et je voulais savoir si quelque chose vous bloquait.",
  },
  {
    id: "atelier-cobalt",
    name: "Atelier Cobalt",
    initials: "AC",
    mrr: 590,
    score: 78,
    reasons: ["Usage en baisse de 60 % en 3 semaines", "Ticket support sans réponse"],
    renewsInDays: 9,
    action: "Proposer un point de 15 min",
    contact: { firstName: "Hugo", role: "Directeur général" },
    plan: "Offre Équipe · 14 places",
    since: "septembre 2024",
    seats: { active: 6, total: 14 },
    usage: [88, 92, 85, 90, 94, 87, 80, 71, 52, 40, 36, 34],
    signals: [
      {
        label: "Usage en baisse de 60 % en 3 semaines",
        detail: "Surtout sur la fonction Planning.",
      },
      {
        label: "Ticket support sans réponse",
        detail: "Ouvert il y a 5 jours sur la synchronisation.",
      },
      { label: "Renouvellement dans 9 jours", detail: "Prélèvement mensuel." },
    ],
    timeline: [
      { daysAgo: 5, label: "Ticket « Synchronisation agenda en erreur »", tone: "warning" },
      { daysAgo: 21, label: "Début de la baisse d'usage", tone: "warning" },
      { daysAgo: 120, label: "Ajout de 4 places", tone: "positive" },
      { daysAgo: 400, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Je sais que votre souci de synchronisation d'agenda n'est pas encore réglé, et je tenais à m'en occuper personnellement.",
  },
  {
    id: "verso-rh",
    name: "Verso RH",
    initials: "VR",
    mrr: 450,
    score: 71,
    reasons: ["Carte bancaire expirée", "2 paiements échoués"],
    renewsInDays: 4,
    action: "Envoyer la relance carte",
    contact: { firstName: "Sonia", role: "Office manager" },
    plan: "Offre Équipe · 10 places",
    since: "janvier 2025",
    seats: { active: 9, total: 10 },
    usage: [52, 55, 51, 58, 54, 57, 53, 55, 56, 52, 54, 53],
    signals: [
      { label: "Carte bancaire expirée", detail: "Fin de validité le 30 septembre." },
      { label: "2 paiements échoués", detail: "Prochaine tentative automatique dans 2 jours." },
      {
        label: "Usage stable",
        detail: "L'équipe utilise l'outil : un départ serait involontaire.",
      },
    ],
    timeline: [
      { daysAgo: 3, label: "2ᵉ paiement échoué", tone: "warning" },
      { daysAgo: 10, label: "1er paiement échoué : carte expirée", tone: "warning" },
      { daysAgo: 60, label: "Note de satisfaction : 9 sur 10", tone: "positive" },
      { daysAgo: 300, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Votre dernier paiement n'est pas passé, sans doute parce que la carte enregistrée a expiré. Rien de grave : il suffit de la mettre à jour.",
  },
  {
    id: "orbe-formation",
    name: "Orbe Formation",
    initials: "OF",
    mrr: 290,
    score: 64,
    reasons: ["N'utilise plus la fonction Planning", "Offre réduite le mois dernier"],
    renewsInDays: 12,
    action: "Partager le guide Planning",
    contact: { firstName: "Mehdi", role: "Responsable pédagogique" },
    plan: "Offre Essentiel · 6 places",
    since: "juin 2025",
    seats: { active: 4, total: 6 },
    usage: [30, 33, 31, 29, 28, 26, 22, 21, 19, 18, 17, 16],
    signals: [
      {
        label: "N'utilise plus la fonction Planning",
        detail: "Aucune ouverture depuis 4 semaines.",
      },
      { label: "Offre réduite le mois dernier", detail: "Passage de l'offre Équipe à Essentiel." },
    ],
    timeline: [
      { daysAgo: 28, label: "Dernière ouverture du Planning", tone: "warning" },
      { daysAgo: 34, label: "Passage à l'offre Essentiel", tone: "warning" },
      { daysAgo: 140, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "J'ai remarqué que vous n'utilisiez plus le Planning, alors je vous envoie notre guide de 5 minutes pour en tirer le meilleur.",
  },
  {
    id: "maison-pivot",
    name: "Maison Pivot",
    initials: "MP",
    mrr: 380,
    score: 54,
    reasons: ["Un seul utilisateur actif depuis 3 semaines"],
    renewsInDays: 21,
    action: "Proposer d'inviter l'équipe",
    contact: { firstName: "Léa", role: "Fondatrice" },
    plan: "Offre Équipe · 8 places",
    since: "avril 2025",
    seats: { active: 1, total: 8 },
    usage: [34, 31, 30, 28, 25, 20, 14, 12, 11, 10, 11, 10],
    signals: [
      {
        label: "Un seul utilisateur actif depuis 3 semaines",
        detail: "Les clients qui restent seuls partent 3 fois plus souvent.",
      },
    ],
    timeline: [
      { daysAgo: 22, label: "Dernière connexion d'un collègue de Léa", tone: "warning" },
      { daysAgo: 190, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Vous êtes la seule de l'équipe à utiliser l'outil en ce moment : voulez-vous que je vous aide à embarquer vos collègues ?",
  },
  {
    id: "studio-nereide",
    name: "Studio Néréide",
    initials: "SN",
    mrr: 240,
    score: 49,
    reasons: ["A consulté la page de résiliation"],
    renewsInDays: 15,
    action: "Demander un retour",
    contact: { firstName: "Paul", role: "Gérant" },
    plan: "Offre Essentiel · 4 places",
    since: "novembre 2025",
    seats: { active: 4, total: 4 },
    usage: [18, 19, 17, 20, 18, 19, 18, 17, 16, 17, 15, 16],
    signals: [
      { label: "A consulté la page de résiliation", detail: "Deux fois cette semaine." },
      { label: "Usage encore stable", detail: "Il est temps de comprendre ce qui manque." },
    ],
    timeline: [
      { daysAgo: 2, label: "Visite de la page de résiliation", tone: "warning" },
      { daysAgo: 4, label: "Visite de la page de résiliation", tone: "warning" },
      { daysAgo: 330, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Votre avis compte beaucoup pour nous : y a-t-il quelque chose que l'outil ne fait pas encore et qui vous manque ?",
  },
  {
    id: "cap-horizon",
    name: "Cap Horizon Conseil",
    initials: "CH",
    mrr: 690,
    score: 45,
    reasons: ["Exports de données en hausse"],
    renewsInDays: 27,
    action: "Faire un point annuel",
    contact: { firstName: "Isabelle", role: "Associée" },
    plan: "Offre Équipe · 20 places",
    since: "février 2024",
    seats: { active: 17, total: 20 },
    usage: [120, 118, 125, 121, 119, 117, 120, 116, 114, 115, 112, 111],
    signals: [
      {
        label: "Exports de données en hausse",
        detail: "6 exports complets ce mois-ci, contre 1 d'habitude.",
      },
    ],
    timeline: [
      { daysAgo: 7, label: "6ᵉ export complet du mois", tone: "warning" },
      { daysAgo: 250, label: "Ajout de 5 places", tone: "positive" },
      { daysAgo: 620, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Cela fait bientôt deux ans que nous travaillons ensemble : je vous propose un court point pour faire le bilan et préparer la suite.",
  },
  {
    id: "pixel-pepin",
    name: "Pixel & Pépin",
    initials: "PP",
    mrr: 120,
    score: 41,
    reasons: ["2 tickets support en 10 jours"],
    renewsInDays: 18,
    action: "Vérifier que tout est résolu",
    contact: { firstName: "Inès", role: "Cheffe de projet" },
    plan: "Offre Essentiel · 3 places",
    since: "août 2025",
    seats: { active: 3, total: 3 },
    usage: [14, 15, 13, 14, 16, 15, 14, 13, 14, 12, 13, 13],
    signals: [
      { label: "2 tickets support en 10 jours", detail: "Tous deux sur l'import de fichiers." },
    ],
    timeline: [
      { daysAgo: 3, label: "Ticket « Import CSV refusé »", tone: "warning" },
      { daysAgo: 10, label: "Ticket « Import impossible »", tone: "warning" },
      { daysAgo: 85, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Je voulais m'assurer que vos soucis d'import de fichiers sont bien réglés, et vous remercier de votre patience.",
  },
  {
    id: "ferme-numerique",
    name: "Ferme Numérique",
    initials: "FN",
    mrr: 160,
    score: 38,
    reasons: ["Connexions en baisse de 30 %"],
    renewsInDays: 24,
    action: "Partager les nouveautés",
    contact: { firstName: "Julien", role: "Responsable administratif" },
    plan: "Offre Essentiel · 4 places",
    since: "mai 2025",
    seats: { active: 3, total: 4 },
    usage: [24, 25, 23, 24, 22, 21, 20, 19, 18, 17, 17, 16],
    signals: [{ label: "Connexions en baisse de 30 %", detail: "Une baisse lente, sur 2 mois." }],
    timeline: [
      { daysAgo: 60, label: "Début de la baisse des connexions", tone: "warning" },
      { daysAgo: 170, label: "Devient client", tone: "positive" },
    ],
    emailHook:
      "Nous avons ajouté plusieurs nouveautés ces dernières semaines, dont certaines devraient vous faire gagner du temps.",
  },
];

/** Brouillon de l'email de relance, prêt à être relu puis envoyé par l'utilisateur. */
export function draftEmail(customer: WatchedCustomer, senderFirstName: string) {
  return {
    subject: `${customer.contact.firstName}, un point rapide sur votre compte ?`,
    body: [
      `Bonjour ${customer.contact.firstName},`,
      customer.emailHook,
      "Seriez-vous disponible pour un échange de 15 minutes cette semaine ? Je m'adapte à votre agenda.",
      `Bonne journée,\n${senderFirstName || "L'équipe"}`,
    ].join("\n\n"),
  };
}

export type FailedPayment = {
  id: string;
  customer: string;
  amount: number;
  reason: string;
  attempts: number;
  nextRetryInDays: number;
};

/** Paiements échoués à récupérer aujourd'hui (churn involontaire). */
export const FAILED_PAYMENTS: FailedPayment[] = [
  {
    id: "pay-verso",
    customer: "Verso RH",
    amount: 450,
    reason: "Carte expirée",
    attempts: 2,
    nextRetryInDays: 2,
  },
  {
    id: "pay-tisserand",
    customer: "Tisserand & Fils",
    amount: 290,
    reason: "Refusé par la banque",
    attempts: 1,
    nextRetryInDays: 4,
  },
  {
    id: "pay-kalia",
    customer: "Kalia Santé",
    amount: 189,
    reason: "Provision insuffisante",
    attempts: 1,
    nextRetryInDays: 3,
  },
  {
    id: "pay-sillage",
    customer: "Bureau Sillage",
    amount: 99,
    reason: "Carte expirée",
    attempts: 3,
    nextRetryInDays: 1,
  },
  {
    id: "pay-nova",
    customer: "Nova Ateliers",
    amount: 79,
    reason: "Validation bancaire non terminée",
    attempts: 2,
    nextRetryInDays: 2,
  },
];
