// Tunnel de conversion sur les vraies visites (fonctions pures, testées), sans configuration :
// les pages clés viennent de l'analyse du site, ou d'une confirmation en un clic.
// Chaque étape compte les visiteurs qui l'ont atteinte au moins : un visiteur qui ouvre
// directement l'inscription est compté aussi à l'étape « tarifs » (il est allé plus loin).
// Aucun repère « habituel » n'est inventé : seuls les chiffres du site sont montrés.

import { PAGE_PATTERNS } from "@/features/setup/site-analysis";

export type FunnelRow = {
  visitor_id: string;
  type: string;
  path: string;
  device: string | null;
  channel: string;
};

export type KeyPage = "pricing" | "signup";
export type KeyPaths = Record<KeyPage, string | null>;

export type RealFunnelStep = { id: "visit" | KeyPage | "identified"; label: string; count: number };

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
    const bare = (host: string) => host.replace(/^www\./, "");
    const same =
      bare(page.hostname) === bare(site.hostname) ||
      page.hostname.endsWith(`.${bare(site.hostname)}`);
    return same ? page.pathname.replace(/\/$/, "") || "/" : null;
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
 * Tunnel : visiteurs → tarifs → inscription → inscrits identifiés. Une étape n'apparaît que si
 * l'on sait la mesurer (page connue, ou au moins une identification reçue).
 */
export function computeFunnel(
  rows: FunnelRow[],
  paths: KeyPaths,
  channelName: (id: string) => string = (id) => id,
): RealFunnel {
  const visitors = new Map<string, { stage: number; device: string | null; channel: string }>();
  const pathCounts = new Map<string, Set<string>>();
  const hasIdentify = rows.some((row) => row.type === "identify");

  const order: RealFunnelStep["id"][] = ["visit"];
  if (paths.pricing) order.push("pricing");
  if (paths.signup) order.push("signup");
  if (hasIdentify) order.push("identified");
  const stageOf = (row: FunnelRow) => {
    if (row.type === "identify") return order.indexOf("identified");
    if (paths.signup && matches(row.path, paths.signup)) return order.indexOf("signup");
    if (paths.pricing && matches(row.path, paths.pricing)) return order.indexOf("pricing");
    return 0;
  };

  for (const row of rows) {
    const visitor = visitors.get(row.visitor_id);
    const stage = stageOf(row);
    if (!visitor) {
      // Première ligne du visiteur : son appareil et son canal d'arrivée.
      visitors.set(row.visitor_id, { stage, device: row.device, channel: row.channel });
    } else if (stage > visitor.stage) {
      visitor.stage = stage;
    }
    if (row.type === "pageview") {
      const seen = pathCounts.get(row.path) ?? new Set<string>();
      seen.add(row.visitor_id);
      pathCounts.set(row.path, seen);
    }
  }

  const all = [...visitors.values()];
  const labels: Record<RealFunnelStep["id"], string> = {
    visit: "Visiteurs",
    pricing: "Tarifs vus",
    signup: "Inscription ouverte",
    identified: "Inscrits",
  };
  const steps = order.map((id, index) => ({
    id,
    label: labels[id],
    count: all.filter((visitor) => visitor.stage >= index).length,
  }));

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
    const groups = new Map<string, { visitors: number; reached: number }>();
    for (const visitor of all) {
      const id = visitor[key];
      if (!id) continue;
      const group = groups.get(id) ?? { visitors: 0, reached: 0 };
      group.visitors += 1;
      if (visitor.stage >= last) group.reached += 1;
      groups.set(id, group);
    }
    return [...groups]
      .map(([id, group]) => ({
        id,
        name: name(id),
        visitors: group.visitors,
        rate: Math.round((group.reached / group.visitors) * 1000) / 10,
      }))
      .sort((a, b) => b.visitors - a.visitors);
  };

  const guess = (page: KeyPage) => {
    if (paths[page]) return null;
    const [best] = [...pathCounts]
      .filter(([path]) => path !== "/" && PAGE_PATTERNS[page].test(path))
      .sort((a, b) => b[1].size - a[1].size);
    return best?.[0] ?? null;
  };

  return {
    visitors: all.length,
    steps,
    weakest: last > 0 ? weakest : -1,
    segments: {
      device: last > 0 ? segment("device", (id) => DEVICE_NAMES[id] ?? id) : [],
      channel: last > 0 ? segment("channel", channelName) : [],
    },
    guesses: { pricing: guess("pricing"), signup: guess("signup") },
  };
}

/** Constat, cause probable et action pour l'étape qui perd le plus. Aucun chiffre inventé. */
export const STEP_ADVICE: Record<
  KeyPage | "identified",
  { title: string; cause: string; action: string }
> = {
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
