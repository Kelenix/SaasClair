import { AttributionTracker } from "@/features/attribution/attribution-tracker";
import { SiteFooter } from "@/features/marketing/site-footer";
import { SiteHeader } from "@/features/marketing/site-header";
import { TrackingLoader } from "@/features/site-content/tracking-loader";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-50 rounded-full bg-forest px-5 py-3 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <SiteHeader />
      <main id="contenu">{children}</main>
      <SiteFooter />
      <AttributionTracker />
      <TrackingLoader />
    </>
  );
}
