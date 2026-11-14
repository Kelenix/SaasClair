import type { MetadataRoute } from "next";
import { getAboutPage } from "@/features/site-content/queries";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const about = await getAboutPage();
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/inscription`, changeFrequency: "monthly", priority: 0.6 },
    ...(about
      ? [{ url: `${SITE_URL}/a-propos`, changeFrequency: "monthly" as const, priority: 0.5 }]
      : []),
    { url: `${SITE_URL}/llms.txt`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
