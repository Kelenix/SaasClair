import { z } from "zod";
import { CHANNELS } from "./channels";

// Provenance d'un visiteur au premier passage (« premier contact ») : gardée 30 jours dans un
// cookie interne au site, puis enregistrée sur le profil à l'inscription. Aucun traceur tiers.
// Lecture du cookie côté serveur (avec zod) ; le classement des visites, sans dépendance, est
// dans channels.ts pour que le site vitrine n'embarque pas zod dans le navigateur.

export {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE,
  CHANNEL_LABELS,
  CHANNELS,
  classifyChannel,
  type Channel,
} from "./channels";

const text = (max: number) => z.string().trim().max(max).optional().catch(undefined);

const attributionSchema = z.object({
  channel: z.enum(CHANNELS).catch("direct"),
  source: text(100),
  medium: text(100),
  campaign: text(150),
  referrer: text(200),
  landing: text(200),
});
export type Attribution = z.infer<typeof attributionSchema>;

/** Lit la valeur du cookie (JSON encodé) ; toute valeur abîmée donne « accès direct ». */
export function parseAttribution(raw: string | undefined): Attribution | null {
  if (!raw) return null;
  try {
    return attributionSchema.parse(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

/** Données transmises au compte à l'inscription (reprises par le profil). */
export const attributionMetadata = (attribution: Attribution | null) =>
  attribution
    ? {
        signup_channel: attribution.channel,
        signup_source: attribution.source,
        signup_medium: attribution.medium,
        signup_campaign: attribution.campaign,
        signup_referrer: attribution.referrer,
        signup_landing: attribution.landing,
      }
    : {};
