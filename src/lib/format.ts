const LOCALE = "fr-FR";

const euro = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

// Intl sépare les milliers par une espace fine (U+202F) absente de Fraunces :
// on la remplace par une espace insécable classique, présente dans les deux polices.
const NARROW_NBSP = new RegExp(String.fromCharCode(0x202f), "g");
const NBSP = String.fromCharCode(0xa0);
const withNbsp = (text: string) => text.replace(NARROW_NBSP, NBSP);

export const formatEuro = (value: number) => withNbsp(euro.format(value));

const euroCents = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
/** Montant exact (centimes affichés seulement s'il y en a) : prix facturés, factures. */
export const formatEuroExact = (value: number) =>
  withNbsp(euroCents.format(value).replace(/,(\d)(?!\d)/, ",$10"));

export const formatNumber = (value: number) => withNbsp(number.format(value));

export const formatPercent = (value: number, fractionDigits = 1) =>
  withNbsp(
    new Intl.NumberFormat(LOCALE, {
      style: "percent",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value / 100),
  );

export type NumberFormat = "euro" | "euroExact" | "number" | "percent";

export const formatters: Record<NumberFormat, (value: number) => string> = {
  euro: formatEuro,
  euroExact: formatEuroExact,
  number: formatNumber,
  percent: (value) => formatPercent(value),
};
