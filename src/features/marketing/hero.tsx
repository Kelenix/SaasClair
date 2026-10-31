import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnalyzeForm } from "./analyze-form";
import { HeroDashboard } from "./hero-dashboard";
import { HeroStats } from "./hero-stats";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 sm:px-10 sm:pt-16">
        {/* Entrée en CSS : le titre (plus grand élément affiché) apparaît dès le premier rendu,
            sans attendre le JavaScript. */}
        <div className="mx-auto flex max-w-5xl animate-in flex-col items-center text-center duration-500 ease-out fade-in-0 slide-in-from-bottom-4 motion-reduce:slide-in-from-bottom-0">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-forest shadow-card backdrop-blur">
            <span className="pulse-ring size-2 rounded-full bg-gold text-gold" aria-hidden />
            Installation en 2 clics, zéro configuration
          </p>
          <h1 className="mb-6 text-[42px] leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-[76px]">
            Comprenez votre SaaS en <span className="text-emerald-ink">5&nbsp;minutes</span>, pas en
            5&nbsp;semaines.
          </h1>
          <p className="mb-9 max-w-2xl text-[17px] text-slate sm:text-lg">
            Deux clics, et vous savez enfin d&apos;où viennent vos clients, pourquoi ils
            n&apos;achètent pas et <mark className="text-ink mark-gold">qui va partir</mark>, sans
            rien configurer.
          </p>
          <AnalyzeForm />
          <p className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-slate">
            Gratuit 14 jours · Connexion Stripe en lecture seule
            <Link
              href="#fonctionnalites"
              className="inline-flex items-center gap-1 rounded-md font-semibold text-forest underline-offset-4 hover:underline"
            >
              Voir comment ça marche <Icon icon={ArrowDown} anim="bounce" className="size-4" />
            </Link>
          </p>
        </div>

        <div className="mt-12 sm:mt-16">
          <HeroDashboard />
        </div>
      </div>
      <div className="relative px-4 pt-4 pb-10 sm:px-10 sm:pb-14">
        <HeroStats />
      </div>
    </section>
  );
}
