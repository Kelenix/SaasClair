"use server";

import { revalidatePath, updateTag } from "next/cache";
import { SITE_CONTENT_TAG } from "@/features/site-content/tags";
import { logAdminAction, superAdminOrNull } from "./guard";
import { siteSettingsSchema } from "./settings-schema";

type Result = { ok: true } | { ok: false; message: string };

/** Identifiants publicitaires et email de contact du site. */
export async function saveSiteSettings(input: unknown): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: "Action réservée au super administrateur." };
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Vérifiez les champs." };
  }
  const value = parsed.data;
  const { error } = await admin.supabase
    .from("site_settings")
    .update({
      google_ads_id: value.googleAdsId,
      google_ads_conversion_label: value.googleAdsConversionLabel,
      ga4_id: value.ga4Id,
      meta_pixel_id: value.metaPixelId,
      linkedin_partner_id: value.linkedinPartnerId,
      contact_email: value.contactEmail,
    })
    .eq("id", 1);
  if (error) return { ok: false, message: "Les réglages n'ont pas pu être enregistrés." };
  await logAdminAction(admin.supabase, "reglages.modifies", "site_settings", {
    pixels: [value.googleAdsId, value.ga4Id, value.metaPixelId, value.linkedinPartnerId].filter(
      Boolean,
    ).length,
  });
  updateTag(SITE_CONTENT_TAG);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
