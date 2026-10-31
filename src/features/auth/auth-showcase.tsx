"use client";

import { m } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { LiveDot } from "@/components/data/live-dot";
import { RiskMeter } from "@/components/data/risk-meter";
import { Sparkline } from "@/components/data/sparkline";
import { Badge } from "@/components/ui/badge";
import { formatEuro } from "@/lib/format";
import { DURATION, EASE_OUT } from "@/lib/motion";

const REVENUE = [19.2, 19.9, 20.3, 21.4, 21.9, 22.8, 23.6, 24.1, 25];

const AT_RISK = [
  { initials: "LB", name: "Lumen Bureau", reason: "Pas de connexion depuis 18 jours", score: 86 },
  { initials: "OF", name: "Orbe Formation", reason: "Carte bancaire expirée", score: 72 },
];

const appear = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.screen * 1.5, ease: EASE_OUT, delay },
});

/** Panneau vert forêt des écrans d'accès : aperçu flottant du tableau de bord et signature. */
export function AuthShowcase() {
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-forest p-12 text-cream lg:flex lg:flex-col lg:justify-between xl:p-16"
    >
      <div className="pointer-events-none absolute -top-48 -right-48 size-[620px] rounded-full border-[80px] border-emerald/12" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-[420px] rounded-full bg-emerald/10 blur-3xl" />

      <p className="relative eyebrow text-gold!">Santé de votre SaaS, en direct</p>

      <div className="relative mx-auto w-full max-w-md">
        <m.div
          {...appear(0.2)}
          className="animate-[float_9s_ease-in-out_infinite] rounded-card bg-white p-5 text-ink shadow-float motion-reduce:animate-none"
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] text-slate">Revenu mensuel récurrent</p>
            <LiveDot />
          </div>
          <div className="flex items-end gap-3">
            <AnimatedNumber
              value={25000}
              format="euro"
              className="font-serif text-[34px] leading-tight font-semibold text-forest"
            />
            <Badge tone="growth" className="mb-2">
              <Icon icon={ArrowUpRight} className="size-3.5" /> +4,2 %
            </Badge>
          </div>
          <Sparkline data={REVENUE} label="Revenu en hausse" className="mt-2 h-14" />
        </m.div>

        <m.div
          {...appear(0.6)}
          className="relative z-10 -mt-4 ml-10 animate-[float_11s_ease-in-out_infinite_reverse] rounded-card bg-white p-5 text-ink shadow-float motion-reduce:animate-none"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold">Clients à risque</p>
            <Badge tone="attention" pulse className="text-[11px]">
              {formatEuro(710)} / mois
            </Badge>
          </div>
          {AT_RISK.map((customer) => (
            <div
              key={customer.name}
              className="flex items-center justify-between gap-3 border-t border-line py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream text-[10px] font-bold text-forest">
                  {customer.initials}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">{customer.name}</span>
                  <span className="block truncate text-[11px] text-slate">{customer.reason}</span>
                </span>
              </span>
              <RiskMeter score={customer.score} className="w-16 shrink-0" />
            </div>
          ))}
        </m.div>

        <m.div
          {...appear(1)}
          className="-mt-3 mr-8 rounded-2xl border-l-4 border-gold bg-cream px-4 py-3.5 text-[13px] text-ink shadow-lift"
        >
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-gold-ink uppercase">
            <Icon icon={Sparkles} anim="pop" className="size-3.5" /> Insight de la semaine
          </span>
          Relancez Lumen Bureau avant le 12 novembre :{" "}
          <strong className="text-forest">420 € par mois</strong> en jeu.
        </m.div>
      </div>

      <div className="relative">
        <p className="max-w-md font-serif text-[34px] leading-tight font-semibold text-cream">
          Captez plus de clients, <span className="text-emerald">gardez-les plus longtemps.</span>
        </p>
        <p className="mt-3 text-sm text-cream/80">
          Stripe : lecture uniquement · Données hébergées en Europe
        </p>
      </div>
    </aside>
  );
}
