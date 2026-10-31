import { Reveal } from "@/components/motion/reveal";
import { AnalyzeForm } from "./analyze-form";

export function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-10 sm:pb-28">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-panel bg-forest px-6 py-12 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 -right-36 size-[460px] rounded-full border-[60px] border-emerald/15"
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center">
          <p className="eyebrow text-gold!">Essai gratuit de 7 jours</p>
          <h2 className="mb-4 text-[32px] text-cream sm:text-5xl">
            Captez plus de clients, gardez-les plus longtemps.
          </h2>
          <p className="mb-8 text-[17px] text-cream/80">
            Entrez l&apos;adresse de votre SaaS. Dans 5 minutes, vous savez qui risque de partir.
          </p>
          <AnalyzeForm tone="dark" />
        </div>
      </Reveal>
    </section>
  );
}
