// Outils communs aux données de démonstration (ADR-002) : hasard à graine fixe, découpage du temps.

import { PERIOD_DAYS, type Period } from "./period";

export const NADIA_MRR = 25_000;
export const NADIA_CUSTOMERS = 340;
export const DAY_MS = 86_400_000;

/** Générateur pseudo-aléatoire à graine fixe : mêmes chiffres au serveur, au navigateur et aux tests. */
export function seeded(seed: string) {
  let state = [...seed].reduce(
    (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
    2166136261,
  );
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Série qui va de `from` à `to` avec un léger bruit (mini-courbes des indicateurs). */
export function trend(
  from: number,
  to: number,
  points: number,
  random: () => number,
  noise = 0.03,
) {
  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const jitter = index === 0 || index === points - 1 ? 0 : (random() - 0.5) * 2 * noise;
    return Math.round((from + (to - from) * progress) * (1 + jitter) * 10) / 10;
  });
}

/** Ramène un volume mesuré sur 30 jours à la période choisie. */
export const scale = (value: number, period: Period) =>
  Math.round((value * PERIOD_DAYS[period]) / 30);

const SHORT_DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const SHORT_MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const LONG_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export type TimeSlot = { label: string; /** Part d'un mois de 30 jours. */ share: number };

/** Découpage de la période en tranches : jours, semaines ou mois. */
export function timeSlots(period: Period, now: Date): TimeSlot[] {
  // Mois calendaires (le mois en cours compris) : des pas de 30 jours sauteraient ou doubleraient un mois.
  if (period === "12m") {
    return Array.from({ length: 12 }, (_, index) => ({
      label: SHORT_MONTH.format(new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)),
      share: 365 / 12 / 30,
    }));
  }
  const layout = {
    "7j": { count: 7, days: 1, label: (date: Date) => SHORT_DAY.format(date) },
    "30j": { count: 5, days: 6, label: (date: Date) => SHORT_DATE.format(date) },
    "90j": { count: 13, days: 7, label: (date: Date) => SHORT_DATE.format(date) },
  }[period];
  return Array.from({ length: layout.count }, (_, index) => ({
    label: layout.label(new Date(now.getTime() - (layout.count - index) * layout.days * DAY_MS)),
    share: layout.days / 30,
  }));
}

/** Date située `days` jours après `now`, au format « 5 novembre ». */
export const dateIn = (now: Date, days: number) =>
  LONG_DATE.format(new Date(now.getTime() + days * DAY_MS));
