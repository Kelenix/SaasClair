"use client";

import { useRef } from "react";
import { m, useReducedMotion, useScroll, useSpring } from "motion/react";
import { Check, Lock } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { LiveDot } from "@/components/data/live-dot";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { SETUP_STEPS } from "./content";

function ScriptVisual() {
  return (
    // Défile sur petit écran : atteignable au clavier.
    <code
      tabIndex={0}
      className="block overflow-x-auto rounded-xl bg-forest-deep px-4 py-3 font-mono text-[12px] leading-relaxed whitespace-nowrap text-cream/90 outline-none focus-visible:outline-2 focus-visible:outline-emerald"
    >
      <span className="text-emerald">&lt;script</span> async
      src=&quot;https://saasclair.com/s.js&quot;
      <span className="text-emerald">&gt;&lt;/script&gt;</span>
    </code>
  );
}

function StripeVisual() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-11 items-center rounded-full bg-stripe px-5 text-sm font-semibold text-white">
        Connecter Stripe
      </span>
      <span className="inline-flex items-center gap-1.5 text-[13px] text-slate">
        <Icon icon={Lock} className="size-4" /> Lecture seule
      </span>
    </div>
  );
}

function DashboardVisual() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        ["Revenu", "25 000 €"],
        ["Churn", "7,0 %"],
        ["À risque", "4 clients"],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl bg-cream px-3 py-2.5">
          <p className="text-[11px] text-slate">{label}</p>
          <p className="font-serif text-base font-semibold text-forest sm:text-lg">{value}</p>
        </div>
      ))}
    </div>
  );
}

const VISUALS = [ScriptVisual, StripeVisual, DashboardVisual];

export function TwoClicks() {
  const stepsRef = useRef<HTMLOListElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: stepsRef, offset: ["start 75%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section className="border-t border-line bg-white py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <Reveal className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow">2 clics, zéro configuration</p>
          <h2 className="mb-4 text-[32px] sm:text-[40px]">
            Deux actions. Moins de 5 minutes. C&apos;est tout.
          </h2>
          <p className="max-w-md text-[17px] text-slate">
            Pas de tableau à construire, pas de réglage à faire. Le script voit votre site, Stripe
            voit vos paiements : SaasClair relie les deux tout seul.
          </p>
        </Reveal>

        <ol ref={stepsRef} className="relative space-y-6 pl-12 sm:pl-16">
          <span
            aria-hidden
            className="absolute top-2 bottom-2 left-[19px] w-0.5 rounded-full bg-line sm:left-[23px]"
          />
          <m.span
            aria-hidden
            className="absolute top-2 bottom-2 left-[19px] w-0.5 origin-top rounded-full bg-emerald sm:left-[23px]"
            style={{ scaleY: prefersReducedMotion ? 1 : progress }}
          />
          {SETUP_STEPS.map((step, index) => {
            const Visual = VISUALS[index];
            return (
              <li key={step.title} className="relative">
                <m.span
                  aria-hidden
                  className="absolute top-5 -left-12 grid size-10 place-items-center rounded-full border-2 border-emerald bg-white font-serif text-base font-semibold text-forest sm:-left-16 sm:size-12"
                  initial={{ scale: 0.6, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "0px 0px -35% 0px" }}
                  transition={SPRING}
                >
                  {index + 1}
                </m.span>
                <m.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -25% 0px" }}
                  transition={{ duration: DURATION.screen, ease: EASE_OUT }}
                  className="rounded-card border border-line bg-white p-6 shadow-card"
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xl">{step.title}</h3>
                    <span className="text-[13px] font-medium text-slate">{step.duration}</span>
                  </div>
                  <p className="mb-5 text-[15px] text-slate">{step.text}</p>
                  <Visual />
                  <m.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "0px 0px -40% 0px" }}
                    transition={{ ...SPRING, delay: 0.4 }}
                    className="mt-5 flex items-center justify-between gap-3"
                  >
                    <Badge tone="growth">
                      <Icon icon={Check} className="size-3.5" />
                      {step.done}
                    </Badge>
                    {index === SETUP_STEPS.length - 1 && <LiveDot />}
                  </m.div>
                </m.div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
