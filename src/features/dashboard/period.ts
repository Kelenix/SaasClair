// Période globale du tableau de bord, mémorisée dans un cookie pour être partagée par tous les écrans.

export const PERIODS = ["7j", "30j", "90j", "12m"] as const;
export type Period = (typeof PERIODS)[number];

const DEFAULT_PERIOD: Period = "30j";

/** Cookie qui mémorise la période choisie d'un écran à l'autre. */
export const PERIOD_COOKIE = "sc_periode";

export const PERIOD_LABELS: Record<Period, string> = {
  "7j": "7 jours",
  "30j": "30 jours",
  "90j": "90 jours",
  "12m": "12 mois",
};

export const PERIOD_DAYS: Record<Period, number> = { "7j": 7, "30j": 30, "90j": 90, "12m": 365 };

/** Période personnalisée « du … au … » : ramenée à la période standard la plus proche. */
export function periodFromRange(from: string, to: string): Period {
  const days = Math.max(1, (Date.parse(to) - Date.parse(from)) / 86_400_000);
  return PERIODS.reduce((best, period) =>
    Math.abs(PERIOD_DAYS[period] - days) < Math.abs(PERIOD_DAYS[best] - days) ? period : best,
  );
}

export function parsePeriod(value: string | string[] | undefined): Period {
  return PERIODS.includes(value as Period) ? (value as Period) : DEFAULT_PERIOD;
}
