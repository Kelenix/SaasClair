"use client";

import { m } from "motion/react";
import { Sparkles, Target, TrendingUp } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { GrowBar } from "@/components/data/grow-bar";
import { RiskMeter } from "@/components/data/risk-meter";
import { Sparkline } from "@/components/data/sparkline";
import { Badge } from "@/components/ui/badge";
import { formatEuro, formatNumber, type NumberFormat } from "@/lib/format";
import { DURATION, EASE_OUT, growX, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Écrans de la maquette du hero, avec les mêmes chiffres de démonstration que le vrai tableau de bord.

const CARD = "rounded-2xl border border-line bg-white p-4";

function ViewTitle({ title, summary }: { title: string; summary: string }) {
  return (
    <>
      <p className="mb-1 font-serif text-lg font-semibold text-forest sm:text-xl">{title}</p>
      <p className="mb-5 text-[13px] text-slate">{summary}</p>
    </>
  );
}

function MiniStats({
  stats,
}: {
  stats: { label: string; value: number; format?: NumberFormat; tone?: "gold" }[];
}) {
  return (
    <div className="mb-3 grid grid-cols-3 gap-2.5">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-line bg-white p-3">
          <p className="truncate text-[11px] text-slate">{stat.label}</p>
          <AnimatedNumber
            value={stat.value}
            format={stat.format}
            className={cn(
              "block font-serif text-lg font-semibold sm:text-[22px]",
              stat.tone === "gold" ? "text-gold-ink" : "text-forest",
            )}
          />
        </div>
      ))}
    </div>
  );
}

const CHANNELS = [
  { name: "Recherche Google", revenue: 9800, customers: 31 },
  { name: "LinkedIn", revenue: 6200, customers: 19 },
  { name: "Accès direct", revenue: 4100, customers: 12 },
  { name: "Partenaires", revenue: 3100, customers: 8 },
  { name: "Instagram", revenue: 1800, customers: 5 },
];

export function AcquisitionView() {
  return (
    <>
      <ViewTitle
        title="Acquisition"
        summary="Recherche Google vous rapporte le plus. LinkedIn, vos clients les plus fidèles."
      />
      <MiniStats
        stats={[
          { label: "Visiteurs", value: 18400 },
          { label: "Inscriptions", value: 1290 },
          { label: "Nouveaux clients", value: 75 },
        ]}
      />
      <div className={CARD}>
        <p className="mb-3 text-[13px] font-semibold text-ink">Revenu mensuel par canal</p>
        <ul className="space-y-3">
          {CHANNELS.map((channel, index) => (
            <li key={channel.name}>
              <div className="mb-1 flex justify-between gap-3 text-[12px]">
                <span className="text-ink">{channel.name}</span>
                <span className="font-semibold text-forest tabular-nums">
                  {formatEuro(channel.revenue)}
                </span>
              </div>
              <GrowBar
                share={(channel.revenue / CHANNELS[0].revenue) * 100}
                delay={index * STAGGER}
                tone={index === CHANNELS.length - 1 ? "gold" : "emerald"}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

const FUNNEL = [
  { label: "Visite", count: 18400 },
  { label: "Inscription", count: 1290 },
  { label: "Activation", count: 720 },
  { label: "Essai", count: 408 },
  { label: "Paiement", count: 75 },
];

export function TunnelView() {
  return (
    <>
      <ViewTitle
        title="Tunnel de conversion"
        summary="0,41 % de vos visiteurs deviennent clients. Le paiement freine, surtout sur mobile."
      />
      <div className={CARD}>
        <m.ol className="space-y-2.5" initial="hidden" animate="show">
          {FUNNEL.map((step, index) => {
            const isWeakest = index === FUNNEL.length - 1;
            return (
              <li
                key={step.label}
                className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3"
              >
                <span className="text-[12px] font-semibold text-ink">{step.label}</span>
                <span className="flex h-6 items-center justify-center">
                  <m.span
                    variants={growX}
                    custom={index * STAGGER}
                    className={cn(
                      "block h-full origin-center rounded-lg",
                      isWeakest ? "bg-gold" : "bg-emerald",
                    )}
                    style={{
                      width: `${Math.max(5, Math.sqrt(step.count / FUNNEL[0].count) * 100)}%`,
                    }}
                  />
                </span>
                <span className="text-right text-[12px] font-semibold text-forest tabular-nums">
                  {formatNumber(step.count)}
                </span>
              </li>
            );
          })}
        </m.ol>
        <p className="mt-4 rounded-xl border-l-4 border-gold bg-cream px-3 py-2 text-[12px] text-ink">
          <strong className="text-forest">Paiement :</strong> 18,4 % des essais paient, contre 25 %
          d&apos;habitude. Cause probable : le formulaire sur mobile.
        </p>
      </div>
    </>
  );
}

const AT_RISK = [
  {
    initials: "LB",
    name: "Lumen Bureau",
    reason: "Pas de connexion depuis 18 jours",
    mrr: 420,
    score: 86,
  },
  {
    initials: "AC",
    name: "Atelier Cobalt",
    reason: "Usage en baisse de 60 %",
    mrr: 590,
    score: 78,
  },
  { initials: "VR", name: "Verso RH", reason: "Carte bancaire expirée", mrr: 450, score: 71 },
];

export function AtRiskList({ delay = 0 }: { delay?: number }) {
  return (
    <ul>
      {AT_RISK.map((customer, index) => (
        <m.li
          key={customer.name}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + index * 0.15, duration: DURATION.screen, ease: EASE_OUT }}
          className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
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
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[12px] font-semibold tabular-nums">
              {formatEuro(customer.mrr)}
            </span>
            <RiskMeter score={customer.score} className="w-14" />
          </span>
        </m.li>
      ))}
    </ul>
  );
}

const COHORT = [100, 85, 78, 70, 63, 57];

export function ChurnView() {
  return (
    <>
      <ViewTitle
        title="Churn et rétention"
        summary="4 clients risquent de partir. Vous avez 12 jours pour les retenir."
      />
      <MiniStats
        stats={[
          { label: "Churn clients", value: 7, format: "percent" },
          { label: "Revenu à risque", value: 1750, format: "euro", tone: "gold" },
          { label: "Revenu sauvé", value: 1180, format: "euro" },
        ]}
      />
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.3fr_1fr]">
        <div className={CARD}>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Qui risque de partir</p>
            <Badge tone="attention" pulse className="text-[11px]">
              Risque élevé
            </Badge>
          </div>
          <AtRiskList />
        </div>
        <div className={CARD}>
          <p className="mb-3 text-[13px] font-semibold text-ink">Rétention · arrivés en mai</p>
          <div className="grid grid-cols-6 gap-1">
            {COHORT.map((value, month) => (
              <m.span
                key={month}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: month * 0.08, duration: DURATION.screen, ease: EASE_OUT }}
                className="grid h-9 place-items-center rounded-md text-[10px] font-semibold text-forest-deep"
                style={{
                  backgroundColor: `color-mix(in oklab, var(--emerald) ${Math.round(10 + ((value - 35) / 65) * 85)}%, white)`,
                }}
              >
                {value}
              </m.span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate">% de clients encore là, mois après mois</p>
        </div>
      </div>
    </>
  );
}

const MRR = [21.4, 21.9, 22.2, 22.6, 23.1, 23.4, 23.8, 24.1, 24.5, 25];
const FLOWS = [
  { label: "Nouveaux clients", amount: 2150 },
  { label: "Expansion", amount: 760 },
  { label: "Contraction", amount: -152 },
  { label: "Départs", amount: -1750 },
];

export function RevenueView() {
  return (
    <>
      <ViewTitle
        title="Revenus"
        summary="+1 008 € de revenu mensuel ce mois-ci. Les montées en gamme compensent 43 % des départs."
      />
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.3fr_1fr]">
        <div className={CARD}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Revenu mensuel récurrent</p>
            <AnimatedNumber
              value={25000}
              format="euro"
              className="font-serif text-lg font-semibold text-forest"
            />
          </div>
          <Sparkline data={MRR} label="Revenu en hausse" className="h-32 sm:h-36" />
        </div>
        <div className={CARD}>
          <p className="mb-3 text-[13px] font-semibold text-ink">Ce qui l&apos;a fait bouger</p>
          <ul className="space-y-2.5">
            {FLOWS.map((flow, index) => (
              <li key={flow.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-ink">{flow.label}</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      flow.amount > 0 ? "text-emerald-ink" : "text-gold-ink",
                    )}
                  >
                    {flow.amount > 0 ? "+" : "−"}
                    {formatEuro(Math.abs(flow.amount))}
                  </span>
                </div>
                <GrowBar
                  share={(Math.abs(flow.amount) / 2150) * 100}
                  delay={index * STAGGER}
                  tone={flow.amount > 0 ? "emerald" : "gold"}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

const INSIGHTS = [
  {
    area: "Rétention",
    title: "4 clients à fort risque renouvellent dans les 12 jours.",
    action: "Appelez Lumen Bureau et Atelier Cobalt cette semaine.",
    impact: "Jusqu'à 1 750 € par mois gardés",
  },
  {
    area: "Conversion",
    title: "La conversion essai → payant baisse sur mobile.",
    action: "Activez Apple Pay et Google Pay sur la page de paiement.",
    impact: "+6 à 9 clients par mois",
  },
];

export function InsightsView() {
  return (
    <>
      <ViewTitle
        title="Insights de la semaine"
        summary="Chaque recommandation cite ses chiffres et estime son impact en euros."
      />
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {INSIGHTS.map((insight, index) => (
          <m.div
            key={insight.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12, duration: DURATION.screen, ease: EASE_OUT }}
            className={CARD}
          >
            <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-emerald-ink uppercase">
              {insight.area}
            </p>
            <p className="mb-3 font-serif text-[15px] leading-snug font-semibold text-forest">
              {insight.title}
            </p>
            <p className="mb-3 flex gap-2 rounded-xl border-l-4 border-gold bg-cream px-3 py-2 text-[12px] text-ink">
              <Icon icon={Sparkles} className="mt-0.5 size-3.5 shrink-0 text-gold-ink" />
              {insight.action}
            </p>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-forest">
              <Icon icon={TrendingUp} className="size-3.5 text-emerald-ink" />
              {insight.impact}
            </p>
          </m.div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate">
        <Icon icon={Target} className="size-3.5" /> 1 940 € par mois déjà gagnés grâce aux
        recommandations appliquées.
      </p>
    </>
  );
}
