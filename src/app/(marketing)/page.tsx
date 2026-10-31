import type { Metadata } from "next";
import { ChurnSection } from "@/features/marketing/churn-section";
import { PLANS } from "@/features/marketing/content";
import { Faq } from "@/features/marketing/faq";
import { FinalCta } from "@/features/marketing/final-cta";
import { Hero } from "@/features/marketing/hero";
import { Pricing } from "@/features/marketing/pricing";
import { Promises } from "@/features/marketing/promises";
import { getPublicSettings } from "@/features/site-content/queries";
import { Testimonials } from "@/features/marketing/testimonials";
import { TwoClicks } from "@/features/marketing/two-clicks";

export const metadata: Metadata = {
  title: { absolute: "SaasClair — Comprenez votre SaaS en 5 minutes, pas en 5 semaines" },
  alternates: { canonical: "/" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SaasClair",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "fr",
  description:
    "Deux clics, et vous savez enfin d'où viennent vos clients, pourquoi ils n'achètent pas et qui va partir, sans rien configurer.",
  offers: PLANS.flatMap((plan) =>
    plan.monthly
      ? [{ "@type": "Offer", name: plan.name, price: plan.monthly, priceCurrency: "EUR" }]
      : [],
  ),
};

export default async function HomePage() {
  const { contactEmail } = await getPublicSettings();
  return (
    <>
      <script
        type="application/ld+json"
        // Contenu statique, sans donnée utilisateur : pas de risque d'injection.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <Promises />
      <TwoClicks />
      <ChurnSection />
      <Testimonials />
      <Pricing contactEmail={contactEmail} />
      <Faq />
      <FinalCta />
    </>
  );
}
