import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AttributionTracker } from "@/features/attribution/attribution-tracker";
import { AuthShowcase } from "@/features/auth/auth-showcase";
import { TrackingLoader } from "@/features/site-content/tracking-loader";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 py-6 sm:px-12 sm:py-8">
        <Link href="/" aria-label="SaasClair, retour à l'accueil" className="self-start rounded-md">
          <Logo priority className="h-7" />
        </Link>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <p className="text-center text-[13px] text-slate lg:hidden">
          Données hébergées en Europe · Stripe en lecture seule
        </p>
      </div>
      <AuthShowcase />
      <AttributionTracker />
      <TrackingLoader />
    </div>
  );
}
