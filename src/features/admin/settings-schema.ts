import { z } from "zod";

// Formats officiels des identifiants publicitaires (mêmes règles que la base de données).
const optional = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => value || null)
    .refine((value) => value === null || pattern.test(value), message);

export const siteSettingsSchema = z.object({
  googleAdsId: optional(/^AW-[0-9]{6,15}$/, "Google Ads : format attendu AW-123456789."),
  googleAdsConversionLabel: optional(
    /^[A-Za-z0-9_-]{4,64}$/,
    "Libellé de conversion : lettres, chiffres, tirets (ex. AbC-12dEf).",
  ),
  ga4Id: optional(/^G-[A-Z0-9]{4,15}$/, "Google Analytics : format attendu G-ABC123XYZ."),
  metaPixelId: optional(
    /^[0-9]{8,20}$/,
    "Pixel Meta : uniquement des chiffres (ex. 123456789012345).",
  ),
  linkedinPartnerId: optional(/^[0-9]{4,12}$/, "LinkedIn : uniquement des chiffres (ex. 1234567)."),
  contactEmail: optional(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Email de contact : adresse invalide."),
});

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;
