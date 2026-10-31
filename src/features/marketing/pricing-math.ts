import { ANNUAL_DISCOUNT } from "./content";

/** Prix mensuel équivalent d'un abonnement annuel (remise comprise, arrondi à l'euro). */
export const annualMonthlyPrice = (monthly: number) => Math.round(monthly * (1 - ANNUAL_DISCOUNT));
