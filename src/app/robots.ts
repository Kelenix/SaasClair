import type { MetadataRoute } from "next";
import { AI_CRAWLERS, PRIVATE_PATHS } from "@/features/marketing/seo";
import { SITE_URL } from "@/lib/site";

// Un robot nommé suit son propre groupe et ignore « * » : les zones privées sont donc répétées.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
