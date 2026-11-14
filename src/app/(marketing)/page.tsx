import type { Metadata } from "next";
import { ChurnSection } from "@/features/marketing/churn-section";
import { Faq } from "@/features/marketing/faq";
import { FinalCta } from "@/features/marketing/final-cta";
import { Hero } from "@/features/marketing/hero";
import { Pricing } from "@/features/marketing/pricing";
import { Promises } from "@/features/marketing/promises";
import { homeStructuredData, jsonLd } from "@/features/marketing/seo";
import { Testimonials } from "@/features/marketing/testimonials";
import { TwoClicks } from "@/features/marketing/two-clicks";
import { getPublicSettings, getPublishedFaq } from "@/features/site-content/queries";

export const metadata: Metadata = {
  title: { absolute: "SaasClair — Comprenez votre SaaS en 5 minutes, pas en 5 semaines" },
  alternates: {
    canonical: "/",
    // Version texte de l'accueil, pour les assistants IA.
    types: { "text/markdown": [{ url: "/llms.txt", title: "SaasClair en bref" }] },
  },
};

export default async function HomePage() {
  const [faq, settings] = await Promise.all([getPublishedFaq(), getPublicSettings()]);
  const structuredData = homeStructuredData({ faq, contactEmail: settings.contactEmail });
  return (
    <>
      <script
        type="application/ld+json"
        // « < » échappé par jsonLd : un texte de la FAQ ne peut pas fermer la balise.
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <Hero />
      <Promises />
      <TwoClicks />
      <ChurnSection />
      <Testimonials />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
