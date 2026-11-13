// Moteur d'insights sur les vraies données (fonctions pures, testées) : Stripe, visites du script
// et analyse du site. Chaque insight cite ses chiffres, dit quoi faire et ce que ça peut rapporter.
// Aucun chiffre inventé : un insight n'existe que si les données le montrent.

import type { RealAcquisition } from "@/features/collect/aggregate";
import type { Insight } from "@/features/dashboard/demo-data";
import type { SiteAudit } from "@/features/setup/site-analysis";
import type { RealRevenue } from "@/features/stripe/metrics";
import { formatEuro, formatPercent } from "@/lib/format";

export type InsightFacts = {
  now: Date;
  siteUrl: string | null;
  audit: SiteAudit | null;
  /** Revenus et churn sur 30 jours (null : Stripe pas encore connecté). */
  revenue: RealRevenue | null;
  /** Visites sur 30 jours. */
  visits: RealAcquisition | null;
};

export type RealInsight = Insight & {
  /** Écran où agir. */
  href: string;
  /** Ordre d'affichage : l'argent en jeu et l'urgence d'abord. */
  priority: number;
};

const DAY_MS = 86_400_000;

/** Semaine ISO (« 2026-46 ») : un insight récurrent revient chaque semaine s'il est toujours vrai. */
export function weekKey(now: Date) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

/** « A », « A et B », « A, B et C », « A, B et 4 autres ». */
export function listNames(names: string[], max = 3) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length <= max) return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
  const rest = names.length - (max - 1);
  return `${names.slice(0, max - 1).join(", ")} et ${rest} autres`;
}

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count > 1 ? many : word}`;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

const round = (value: number) => Math.round(value * 100) / 100;

function revenueInsights(revenue: RealRevenue, week: string): RealInsight[] {
  const insights: RealInsight[] = [];

  if (revenue.failedInvoices.length) {
    const count = revenue.failedInvoices.length;
    insights.push({
      id: `paiements-${week}`,
      area: "Revenus",
      title: `${formatEuro(revenue.failedAmount)} de paiements échoués à récupérer.`,
      finding: `${plural(count, "facture impayée", "factures impayées")} : ${listNames([
        ...new Set(revenue.failedInvoices.map((invoice) => invoice.customer)),
      ])}.`,
      cause:
        "Le plus souvent, une carte expirée ou refusée : le client ne sait pas que son paiement a échoué.",
      action:
        "Envoyez à chacun le lien de paiement de sa facture depuis Stripe, et activez les relances automatiques de cartes dans vos réglages de facturation Stripe.",
      impact: `Jusqu'à ${formatEuro(revenue.failedAmount)} récupérés`,
      impactEuros: revenue.failedAmount,
      confidence: "élevée",
      basis: `${plural(count, "facture ouverte", "factures ouvertes")} dans Stripe`,
      href: "/app/revenus",
      priority: 100,
    });
  }

  const leaving = revenue.atRisk.filter((risk) =>
    risk.reasons.some((reason) => reason.kind === "cancel_scheduled"),
  );
  if (leaving.length) {
    const mrr = round(leaving.reduce((total, risk) => total + risk.mrr, 0));
    const first = [...leaving]
      .filter((risk) => risk.periodEnd)
      .sort((a, b) => Date.parse(a.periodEnd!) - Date.parse(b.periodEnd!))[0];
    insights.push({
      id: `departs-${week}`,
      area: "Rétention",
      title: `${plural(leaving.length, "client a programmé son départ", "clients ont programmé leur départ")}.`,
      finding: `${listNames(leaving.map((risk) => risk.name))} : ${formatEuro(mrr)} de revenu mensuel.${
        first?.periodEnd ? ` Premier départ le ${day(first.periodEnd)}.` : ""
      }`,
      cause:
        "La résiliation est déjà demandée dans Stripe. Jusqu'à la fin de la période payée, vous pouvez encore les faire changer d'avis.",
      action: first?.periodEnd
        ? `Appelez ${first.name} avant le ${day(first.periodEnd)} : demandez ce qui manque, et proposez une offre plus adaptée ou une pause.`
        : "Appelez-les cette semaine : demandez ce qui manque, et proposez une offre plus adaptée ou une pause.",
      impact: `Jusqu'à ${formatEuro(mrr)} par mois gardés`,
      impactEuros: mrr,
      confidence: "élevée",
      basis: "résiliations programmées dans Stripe",
      href: "/app/churn",
      priority: 95,
    });
  }

  const cards = revenue.atRisk.filter((risk) =>
    risk.reasons.some((reason) => reason.kind === "card_expiring"),
  );
  if (cards.length) {
    const mrr = round(cards.reduce((total, risk) => total + risk.mrr, 0));
    insights.push({
      id: `cartes-${week}`,
      area: "Revenus",
      title: `${plural(cards.length, "carte bancaire expire", "cartes bancaires expirent")} avant le prochain paiement.`,
      finding: `${listNames(cards.map((risk) => risk.name))} : ${formatEuro(mrr)} de revenu mensuel.`,
      cause:
        "Sans nouvelle carte, le prochain prélèvement échouera : c'est la première cause de départ sans le vouloir.",
      action:
        "Envoyez-leur dès maintenant le lien de mise à jour de leur carte (portail client Stripe), avant l'échéance.",
      impact: `${formatEuro(mrr)} par mois protégés`,
      impactEuros: mrr,
      confidence: "élevée",
      basis: "cartes enregistrées dans Stripe",
      href: "/app/churn",
      priority: 85,
    });
  }

  if (revenue.trialsEnding.length) {
    const trials = revenue.trialsEnding;
    const mrr = round(trials.reduce((total, trial) => total + trial.mrr, 0));
    insights.push({
      id: `essais-${week}`,
      area: "Conversion",
      title: `${plural(trials.length, "essai se termine", "essais se terminent")} dans les 7 jours.`,
      finding: `${listNames(trials.map((trial) => trial.name))}. Premier le ${day(trials[0].trialEnd)}.`,
      cause:
        "Un essai qui se termine sans contact est souvent un client perdu : il n'a pas encore vu ce que votre produit lui apporte.",
      action:
        "Écrivez-leur aujourd'hui et proposez un appel de 15 minutes pour les aider à démarrer.",
      impact: mrr > 0 ? `Jusqu'à ${formatEuro(mrr)} par mois` : "Des essais convertis en clients",
      impactEuros: mrr,
      confidence: "moyenne",
      basis: "essais en cours dans Stripe",
      href: "/app/revenus",
      priority: 80,
    });
  }

  const { previous } = revenue;
  const lost = revenue.lostCustomerNames;
  if (
    lost.length >= 2 &&
    previous.customersAtStart > 0 &&
    revenue.customerChurn >= previous.customerChurn + 1
  ) {
    const [plan] = revenue.lostByPlan;
    const fromOnePlan = plan && plan.customers >= 2 && plan.customers * 2 >= lost.length;
    insights.push({
      id: `churn-hausse-${week}`,
      area: "Rétention",
      title: `Votre churn monte : ${formatPercent(revenue.customerChurn)} contre ${formatPercent(previous.customerChurn)} le mois d'avant.`,
      finding: `${plural(lost.length, "client parti", "clients partis")} en 30 jours : ${listNames(lost)}. ${formatEuro(revenue.churnedMrr)} de revenu mensuel perdu.`,
      cause: fromOnePlan
        ? `${plan.customers} de ces départs viennent de l'offre ${plan.plan}.`
        : "Les départs ne viennent pas d'une seule offre : leurs raisons diront quoi corriger.",
      action: fromOnePlan
        ? `Écrivez aux clients partis de l'offre ${plan.plan} pour connaître leur raison, en une seule question.`
        : "Écrivez aux clients partis pour connaître leur raison, en une seule question.",
      impact: `${formatEuro(revenue.churnedMrr)} par mois en jeu`,
      impactEuros: revenue.churnedMrr,
      confidence: "élevée",
      basis: `${plural(revenue.previous.customersAtStart, "client payant")} le mois d'avant`,
      href: "/app/churn",
      priority: 70,
    });
  }

  const top = revenue.topCustomer;
  if (top && top.share >= 25 && revenue.payingCustomers >= 3) {
    insights.push({
      id: "dependance-client",
      area: "Revenus",
      title: `${top.name} pèse ${formatPercent(top.share)} de votre revenu.`,
      finding: `${formatEuro(top.mrr)} par mois sur ${formatEuro(revenue.mrr)}. S'il part, votre revenu baisse d'autant, d'un coup.`,
      cause: "Un très gros client est une chance, et un risque tant qu'il reste seul à ce niveau.",
      action: `Faites un point régulier avec ${top.name}, et cherchez 2 ou 3 clients du même profil.`,
      impact: `${formatEuro(top.mrr)} par mois à protéger`,
      impactEuros: top.mrr,
      confidence: "moyenne",
      basis: `${plural(revenue.payingCustomers, "client payant")}`,
      href: "/app/revenus",
      priority: 40,
    });
  }

  return insights;
}

const failed = (audit: SiteAudit, label: string) =>
  audit.seo.checks.some((check) => check.label === label && !check.ok);

function siteInsights(audit: SiteAudit): RealInsight[] {
  if (!audit.reachable) return [];
  const basis = "analyse de votre page d'accueil";
  const insights: RealInsight[] = [];
  const add = (insight: Omit<RealInsight, "basis" | "impactEuros" | "href">) =>
    insights.push({ ...insight, basis, impactEuros: 0, href: "/app" });

  if (failed(audit, "Connexion sécurisée")) {
    add({
      id: "site-https",
      area: "Conversion",
      title: "Votre site n'est pas en connexion sécurisée.",
      finding: "Les navigateurs affichent « Non sécurisé » à côté de votre adresse.",
      cause: "Ce message fait fuir les visiteurs, surtout au moment de payer.",
      action: "Activez le HTTPS chez votre hébergeur : c'est souvent gratuit et en un clic.",
      impact: "Plus de confiance, plus d'inscriptions",
      confidence: "élevée",
      priority: 65,
    });
  }
  if (failed(audit, "Adapté au mobile")) {
    add({
      id: "site-mobile",
      area: "Conversion",
      title: "Votre site ne s'adapte pas aux téléphones.",
      finding: "Sur mobile, la page s'affiche en tout petit : il faut zoomer pour lire.",
      cause: "Une grande partie des visiteurs arrive sur téléphone et repart aussitôt.",
      action:
        "Demandez à votre développeur d'ajouter la balise « viewport » à vos pages : 2 minutes de travail.",
      impact: "Plus d'inscriptions sur mobile",
      confidence: "élevée",
      priority: 60,
    });
  }
  if (!audit.pages.signup) {
    add({
      id: "site-inscription",
      area: "Conversion",
      title: "Aucun bouton d'inscription visible sur votre accueil.",
      finding: "Nous n'avons trouvé aucun lien vers une page d'inscription ou d'essai.",
      cause: "Un visiteur intéressé doit chercher comment commencer : beaucoup abandonnent.",
      action: "Ajoutez un bouton bien visible en haut de page, par exemple « Essai gratuit ».",
      impact: "Plus d'essais démarrés",
      confidence: "moyenne",
      priority: 58,
    });
  }
  if (!audit.pages.pricing) {
    add({
      id: "site-tarifs",
      area: "Conversion",
      title: "Votre page de tarifs est introuvable depuis l'accueil.",
      finding: "Aucun lien « Tarifs » ou « Prix » sur votre page d'accueil.",
      cause: "Un visiteur qui ne trouve pas le prix part souvent sans essayer.",
      action: "Ajoutez un lien « Tarifs » dans le menu de votre page d'accueil.",
      impact: "Plus de visiteurs qui passent à l'essai",
      confidence: "moyenne",
      priority: 55,
    });
  }
  if (audit.speed === "lent" && audit.responseMs !== null) {
    add({
      id: "site-vitesse",
      area: "Conversion",
      title: `Votre page d'accueil met ${(audit.responseMs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s à répondre.`,
      finding:
        "C'est lent : au-delà de 2 secondes, une partie des visiteurs part avant de voir la page.",
      cause: "Le serveur répond lentement, souvent faute de cache.",
      action:
        "Demandez à votre hébergeur ou développeur d'activer un cache. Un service gratuit comme Cloudflare suffit souvent.",
      impact: "Moins de visiteurs perdus",
      confidence: "moyenne",
      priority: 50,
    });
  }
  if (failed(audit, "Description")) {
    add({
      id: "site-description",
      area: "Acquisition",
      title: "Google n'a pas de bonne description de votre site.",
      finding:
        "Le texte affiché sous votre lien dans les résultats de recherche est absent, trop court ou trop long.",
      cause: "Sans phrase claire, moins de personnes cliquent sur votre site dans Google.",
      action:
        "Écrivez une phrase de 50 à 160 caractères qui dit ce que fait votre produit et pour qui, et ajoutez-la comme description de votre page d'accueil.",
      impact: "Plus de clics depuis Google",
      confidence: "moyenne",
      priority: 35,
    });
  }
  if (failed(audit, "Titre de page")) {
    add({
      id: "site-titre",
      area: "Acquisition",
      title: "Le titre de votre page d'accueil n'aide pas Google.",
      finding: "Il est absent, trop court ou trop long (idéal : 10 à 70 caractères).",
      cause: "C'est le texte du lien bleu dans les résultats : il décide du clic.",
      action:
        "Donnez-lui votre nom et ce que vous faites, par exemple « MonSaaS · Factures en 1 clic ».",
      impact: "Plus de clics depuis Google",
      confidence: "moyenne",
      priority: 34,
    });
  }
  return insights;
}

function visitInsights(visits: RealAcquisition): RealInsight[] {
  const [top] = visits.channels;
  if (visits.visitors < 100 || !top || top.share < 70) return [];
  return [
    {
      id: "canal-dependance",
      area: "Acquisition",
      title: `${formatPercent(top.share)} de vos visiteurs viennent de « ${top.name} ».`,
      finding: `${top.visitors} visiteurs sur ${visits.visitors} en 30 jours.`,
      cause:
        "Si ce canal ralentit (changement chez Google, fin d'une campagne), vos inscriptions ralentissent avec lui.",
      action:
        "Testez un deuxième canal ce mois-ci : un article invité, un partenariat ou une newsletter.",
      impact: "Une acquisition moins fragile",
      impactEuros: 0,
      confidence: "moyenne",
      basis: `${visits.visitors} visiteurs sur 30 jours`,
      href: "/app/acquisition",
      priority: 30,
    },
  ];
}

/** Tous les insights du moment, les plus importants d'abord. */
export function buildInsights(facts: InsightFacts): RealInsight[] {
  const week = weekKey(facts.now);
  return [
    ...(facts.revenue ? revenueInsights(facts.revenue, week) : []),
    ...(facts.audit ? siteInsights(facts.audit) : []),
    ...(facts.visits ? visitInsights(facts.visits) : []),
  ].sort((a, b) => b.priority - a.priority || b.impactEuros - a.impactEuros);
}
