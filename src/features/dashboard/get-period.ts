import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { parsePeriod, PERIOD_COOKIE } from "./period";

/** Période choisie. Les chiffres dépendent aussi de la date du jour : rendu à chaque requête. */
export async function getPeriod() {
  await connection();
  return parsePeriod((await cookies()).get(PERIOD_COOKIE)?.value);
}
