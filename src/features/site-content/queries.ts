import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_CONTENT_TAG } from "./tags";

// Contenus du site vitrine gérés depuis l'espace administrateur. Mis en cache (le site reste
// rapide) et rafraîchis à chaque modification par l'étiquette SITE_CONTENT_TAG.

export async function getPublishedFaq() {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);
  cacheLife("hours");
  const { data } = await createPublicClient()
    .from("faq_items")
    .select("id, question, answer")
    .eq("is_published", true)
    .order("position");
  return data ?? [];
}

export async function getPublishedTestimonials() {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);
  cacheLife("hours");
  const { data } = await createPublicClient()
    .from("testimonials")
    .select("id, quote, author, role")
    .eq("is_published", true)
    .order("position");
  return data ?? [];
}

export async function getAboutPage() {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);
  cacheLife("hours");
  const { data } = await createPublicClient()
    .from("site_pages")
    .select("title, intro, body")
    .eq("slug", "a-propos")
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

export type PublicSettings = {
  googleAdsId: string | null;
  googleAdsConversionLabel: string | null;
  ga4Id: string | null;
  metaPixelId: string | null;
  linkedinPartnerId: string | null;
  contactEmail: string | null;
};

/** Identifiants publicitaires (publics par nature) et email de contact. */
export async function getPublicSettings(): Promise<PublicSettings> {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);
  cacheLife("hours");
  const { data } = await createPublicClient()
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return {
    googleAdsId: data?.google_ads_id ?? null,
    googleAdsConversionLabel: data?.google_ads_conversion_label ?? null,
    ga4Id: data?.ga4_id ?? null,
    metaPixelId: data?.meta_pixel_id ?? null,
    linkedinPartnerId: data?.linkedin_partner_id ?? null,
    contactEmail: data?.contact_email ?? null,
  };
}

export const hasTrackers = (settings: PublicSettings) =>
  Boolean(
    settings.googleAdsId || settings.ga4Id || settings.metaPixelId || settings.linkedinPartnerId,
  );
