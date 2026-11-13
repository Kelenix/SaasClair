// Tunnel de conversion sur les vraies visites (fonctions pures, testées), sans configuration :
// les pages clés viennent de l'analyse du site, ou d'une confirmation en un clic.
// Chaque étape compte les visiteurs qui l'ont atteinte au moins : un visiteur qui ouvre
// directement l'inscription est compté aussi à l'étape « tarifs » (il est allé plus loin).
// Aucun repère « habituel » n'est inventé : seuls les chiffres du site sont montrés.

import { PAGE_PATTERNS } from "@/features/setup/site-analysis";
import { isSameSite } from "./payload";

export type FunnelRow = {
  visitor_id: string;
  type: string;
  path: string;
  device: string | null;
  channel: string;
};

export type KeyPage = "pricing" | "signup";
export type KeyPaths = Record<KeyPage, string | null>;

export type RealFunnelStep = {
  id: "visit" | KeyPage | "identified" | "trial" | "paid";
  label: string;
  count: number;
};

export type Segment = { id: string; name: string; visitors: number; rate: number };

export type RealFunnel = {
  visitors: number;
  steps: RealFunnelStep[];
  /** Étape (index) qui perd le plus de visiteurs par rapport à la précédente, sinon -1. */
  weakest: number;
  /** Part des visiteurs qui atteignent la dernière étape, par appareil et par canal. */
  segments: { device: Segment[]; channel: Segment[] };
  /** Page la plus visitée qui ressemble à une page clé non trouvée (question en un clic). */
  guesses: Record<KeyPage, string | null>;
};

/** Chemin d'une page clé, seulement si elle est sur le même site (sinon le script ne la voit pas). */
export function pathOf(url: string | null, siteUrl: string | null) {
  if (!url || !siteUrl) return null;
  try {
    const page = new URL(url);
    const site = new URL(siteUrl);
    // www., app. ou le domaine nu : un seul site.
    return isSameSite(page.hostname, site.hostname)
      ? page.pathname.replace(/\/$/, "") || "/"
      : null;
  } catch {
    return null;
  }
}

const matches = (path: string, keyPath: string) =>
  keyPath !== "/" && (path === keyPath || path.startsWith(`${keyPath}/`));

const DEVICE_NAMES: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablette",
  desktop: "Ordinateur",
};

/**
 * Un groupe de visiteurs : appareil et canal de leur première visite, et les étapes atteintes.
 * C'est ce que renvoie la fonction SQL funnel_summary (une ligne par combinaison).
 */
export type FunnelGroup = {
  device: string | null;
  channel: string;
  pricing: boolean;
  signup: boolean;
  identified: boolean;
  /** Inscrit relié à son client Stripe : essai démarré, puis abonnement payé (Stripe connecté). */
  trial?: boolean;
  paid?: boolean;
  visitors: number;
};
/** Groupes de visiteurs, et pages les plus vues [chemin, visiteurs] (pages clés à deviner). */
export type FunnelSummary = { groups: FunnelGroup[]; paths: [string, number][] };

/** Pages gardées pour deviner une page clé (même valeur dans la fonction SQL). */
export const TOP_PATHS = 200;

/** Regroupement de référence (même règle que funnel_summary), sur des lignes triées. */
export function summarizeFunnel(rows: FunnelRow[], paths: KeyPaths): FunnelSummary {
  const visitors = new Map<string, Omit<FunnelGroup, "visitors">>();
  const pathVisitors = new Map<string, Set<string>>();
  for (const row of rows) {
    let visitor = visitors.get(row.visitor_id);
    if (!visitor) {
      // Première ligne du visiteur : son appareil et son canal d'arrivée.
      visitor = {
        device: row.device,
        channel: row.channel,
        pricing: false,
        signup: false,
        identified: false,
      };
      visitors.set(row.visitor_id, visitor);
    }
    if (row.type === "identify") {
      visitor.identified = true;
      continue;
    }
    if (paths.pricing && matches(row.path, paths.pricing)) visitor.pricing = true;
    if (paths.signup && matches(row.path, paths.signup)) visitor.signup = true;
    const seen = pathVisitors.get(row.path) ?? new Set<string>();
    seen.add(row.visitor_id);
    pathVisitors.set(row.path, seen);
  }
  const groups = new Map<string, FunnelGroup>();
  for (const visitor of visitors.values()) {
    const key = JSON.stringify(visitor);
    const group = groups.get(key) ?? { ...visitor, visitors: 0 };
    group.visitors += 1;
    groups.set(key, group);
  }
  return {
    groups: [...groups.values()],
    paths: [...pathVisitors]
      .map(([path, set]): [string, number] => [path, set.size])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_PATHS),
  };
}

/**
 * Tunnel : visiteurs → tarifs → inscription → inscrits identifiés. Une étape n'apparaît que si
 * l'on sait la mesurer (page connue, ou au moins une identification reçue).
 */
export function funnelFromSummary(
  summary: FunnelSummary,
  paths: KeyPaths,
  channelName: (id: string) => string = (id) => id,
  /** Stripe connecté : le tunnel va jusqu'au paiement. */
  options: { stripe?: boolean } = {},
): RealFunnel {
  const order: RealFunnelStep["id"][] = ["visit"];
  if (paths.pricing) order.push("pricing");
  if (paths.signup) order.push("signup");
  if (summary.groups.some((group) => group.identified)) order.push("identified");
  // Au-delà de l'inscription, Stripe dit qui essaie et qui paie (inscrits reliés à leur client).
  if (options.stripe && order.includes("identified")) {
    if (summary.groups.some((group) => group.trial)) order.push("trial");
    order.push("paid");
  }
  // Étape la plus avancée atteinte par le groupe.
  const stageOf = (group: FunnelGroup) =>
    Math.max(
      0,
      group.identified ? order.indexOf("identified") : 0,
      group.trial ? order.indexOf("trial") : 0,
      group.paid ? order.indexOf("paid") : 0,
      group.signup ? order.indexOf("signup") : 0,
      group.pricing ? order.indexOf("pricing") : 0,
    );
  const staged = summary.groups.map((group) => ({ ...group, stage: stageOf(group) }));

  const labels: Record<RealFunnelStep["id"], string> = {
    visit: "Visiteurs",
    pricing: "Tarifs vus",
    signup: "Inscription ouverte",
    identified: "Inscrits",
    trial: "Essai démarré",
    paid: "Clients payants",
  };
  const countFrom = (index: number) =>
    staged.reduce((total, group) => total + (group.stage >= index ? group.visitors : 0), 0);
  const steps = order.map((id, index) => ({ id, label: labels[id], count: countFrom(index) }));

  let weakest = -1;
  let worstRate = Infinity;
  for (let i = 1; i < steps.length; i++) {
    const rate = steps[i - 1].count ? steps[i].count / steps[i - 1].count : 1;
    if (steps[i - 1].count > 0 && rate < worstRate) {
      worstRate = rate;
      weakest = i;
    }
  }

  const last = steps.length - 1;
  const segment = (key: "device" | "channel", name: (id: string) => string) => {
    const totals = new Map<string, { visitors: number; reached: number }>();
    for (const group of staged) {
      const id = group[key];
      if (!id) continue;
      const total = totals.get(id) ?? { visitors: 0, reached: 0 };
      total.visitors += group.visitors;
      if (group.stage >= last) total.reached += group.visitors;
      totals.set(id, total);
    }
    return [...totals]
      .map(([id, total]) => ({
        id,
        name: name(id),
        visitors: total.visitors,
        rate: Math.round((total.reached / total.visitors) * 1000) / 10,
      }))
      .sort((a, b) => b.visitors - a.visitors || a.id.localeCompare(b.id));
  };

  const guess = (page: KeyPage) => {
    if (paths[page]) return null;
    const best = summary.paths.find(([path]) => path !== "/" && PAGE_PATTERNS[page].test(path));
    return best?.[0] ?? null;
  };

  return {
    visitors: countFrom(0),
    steps,
    weakest: last > 0 ? weakest : -1,
    segments: {
      device: last > 0 ? segment("device", (id) => DEVICE_NAMES[id] ?? id) : [],
      channel: last > 0 ? segment("channel", channelName) : [],
    },
    guesses: { pricing: guess("pricing"), signup: guess("signup") },
  };
}

/** Tunnel calculé sur des lignes (version de référence de la fonction SQL). */
export const computeFunnel = (
  rows: FunnelRow[],
  paths: KeyPaths,
  channelName?: (id: string) => string,
) => funnelFromSummary(summarizeFunnel(rows, paths), paths, channelName);

/** Constat, cause probable et action pour l'étape qui perd le plus. Aucun chiffre inventé. */
export const STEP_ADVICE: Record<
  Exclude<RealFunnelStep["id"], "visit">,
  { title: string; cause: string; action: string }
> = {
  trial: {
    title: "Peu d'inscrits démarrent un essai.",
    cause:
      "L'essai demande une carte bancaire, ou l'inscription ne mène pas tout de suite dans le produit.",
    action:
      "Ouvrez l'essai sans carte bancaire, et amenez l'inscrit directement dans le produit juste après son inscription.",
  },
  paid: {
    title: "Peu d'inscrits deviennent clients payants.",
    cause:
      "La valeur n'est pas vue avant la fin de l'essai, ou le passage au paiement n'est pas rappelé.",
    action:
      "Envoyez un email 3 jours avant la fin de l'essai : ce que le client a déjà obtenu, et un lien direct pour payer.",
  },
  pricing: {
    title: "Peu de visiteurs vont jusqu'à vos tarifs.",
    cause:
      "Le lien vers les tarifs est peu visible, ou l'accueil ne dit pas assez vite ce que fait votre produit.",
    action:
      "Mettez un bouton « Voir les tarifs » en haut de l'accueil, et répétez-le après chaque section.",
  },
  signup: {
    title: "Vos tarifs freinent le passage à l'inscription.",
    cause:
      "Prix difficiles à comparer, offre difficile à choisir, ou essai gratuit pas assez visible.",
    action:
      "Mettez une offre en avant, écrivez « Essai gratuit, sans carte » sous chaque prix, et ajoutez 3 questions fréquentes sous les tarifs.",
  },
  identified: {
    title: "Beaucoup ouvrent l'inscription sans la terminer.",
    cause: "Formulaire trop long, carte bancaire demandée trop tôt, ou étape qui bloque.",
    action:
      "Réduisez le formulaire à l'email et au mot de passe, et proposez la connexion avec Google.",
  },
};
