"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  Check,
  Filter,
  HeartHandshake,
  House,
  Lightbulb,
  Lock,
  MousePointerClick,
  Route,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { LiveDot } from "@/components/data/live-dot";
import { Sparkline } from "@/components/data/sparkline";
import { Badge } from "@/components/ui/badge";
import { formatEuro, type NumberFormat } from "@/lib/format";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { HeroPhone } from "./hero-phone";
import {
  AcquisitionView,
  AtRiskList,
  ChurnView,
  InsightsView,
  RevenueView,
  TunnelView,
} from "./hero-views";

type ViewId = "home" | "acquisition" | "tunnel" | "churn" | "revenue" | "insights";

// Menu de la maquette : chaque entrée affiche l'écran correspondant, comme dans l'application.
const NAV: { id: ViewId; icon: LucideIcon; label: string }[] = [
  { id: "home", icon: House, label: "Accueil" },
  { id: "acquisition", icon: Route, label: "Acquisition" },
  { id: "tunnel", icon: Filter, label: "Tunnel" },
  { id: "churn", icon: HeartHandshake, label: "Churn" },
  { id: "revenue", icon: Wallet, label: "Revenus" },
  { id: "insights", icon: Lightbulb, label: "Insights" },
];

const KPIS: {
  label: string;
  value: number;
  format: NumberFormat;
  delta: string;
  isGood: boolean;
}[] = [
  { label: "Revenu mensuel", value: 25000, format: "euro", delta: "+4,2 %", isGood: true },
  { label: "Taux de churn", value: 7, format: "percent", delta: "−0,6 pt", isGood: true },
  { label: "Revenu à risque", value: 1750, format: "euro", delta: "4 clients", isGood: false },
  { label: "Essai → payant", value: 18.4, format: "percent", delta: "+1,2 pt", isGood: true },
];

const REVENUE = [18.6, 19.1, 19, 19.8, 20.4, 20.1, 21.2, 21.9, 22.4, 22.1, 23.2, 23.8, 24.3, 25];

const SETUP = ["Script installé", "Stripe connecté", "Tableau de bord prêt"];

/** Écran d'accueil de la maquette : « Santé de votre SaaS ». */
function HomeView() {
  return (
    <>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="font-serif text-lg font-semibold text-forest sm:text-xl">Bonjour Nadia.</p>
        <span className="flex items-center gap-3">
          <LiveDot className="hidden sm:inline-flex" />
          <span className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold text-forest">
            30 jours
          </span>
        </span>
      </div>
      <p className="mb-5 text-[13px] text-slate">
        Bonne semaine : votre churn baisse, mais 4 clients sont à surveiller.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-white p-3 sm:p-4">
            <p className="truncate text-[11px] text-slate sm:text-xs">{kpi.label}</p>
            <AnimatedNumber
              value={kpi.value}
              format={kpi.format}
              className="block font-serif text-xl leading-snug font-semibold text-forest sm:text-[26px]"
            />
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                kpi.isGood ? "text-emerald-ink" : "text-gold-ink",
              )}
            >
              <Icon icon={kpi.isGood ? ArrowUpRight : ArrowDownRight} className="size-3" />
              {kpi.delta}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Revenu mensuel récurrent</p>
            <Badge tone="growth" className="text-[11px]">
              +{formatEuro(6400)} en 12 mois
            </Badge>
          </div>
          <div className="bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_39px,var(--sand)_39px,var(--sand)_40px)]">
            <Sparkline
              data={REVENUE}
              label="Revenu en hausse sur 12 mois"
              className="h-32 sm:h-40"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Clients à risque</p>
            <Badge tone="attention" pulse className="text-[11px]">
              4 à surveiller
            </Badge>
          </div>
          <AtRiskList delay={0.6} />
        </div>
      </div>
    </>
  );
}

const VIEWS: Record<ViewId, React.ReactNode> = {
  home: <HomeView />,
  acquisition: <AcquisitionView />,
  tunnel: <TunnelView />,
  churn: <ChurnView />,
  revenue: <RevenueView />,
  insights: <InsightsView />,
};

/** Grande maquette animée et interactive du tableau de bord, posée sous le titre du hero. */
export function HeroDashboard() {
  const [view, setView] = useState<ViewId>("home");
  const [hasExplored, setHasExplored] = useState(false);
  const open = (next: ViewId) => {
    setView(next);
    setHasExplored(true);
  };

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* Les 2 actions, cochées une à une */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, duration: DURATION.screen, ease: EASE_OUT }}
        className="absolute -top-5 left-8 z-20 hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 shadow-card lg:flex"
      >
        {SETUP.map((step, index) => (
          <span key={step} className="flex items-center gap-2 text-[12px] font-medium text-forest">
            {index > 0 && <span aria-hidden className="h-px w-4 bg-line" />}
            <m.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...SPRING, delay: 1.1 + index * 0.35 }}
              className="grid size-4.5 place-items-center rounded-full bg-emerald text-forest-deep"
            >
              <Check className="size-3" strokeWidth={3} aria-hidden />
            </m.span>
            {step}
          </span>
        ))}
      </m.div>

      {/* Alerte « clients à relancer » */}
      <m.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ ...SPRING, delay: 2.2 }}
        className="absolute -top-7 right-4 z-20 hidden items-center gap-3 rounded-2xl border border-line bg-white py-2.5 pr-4 pl-2.5 shadow-lift sm:flex lg:right-40"
        data-icon-trigger
      >
        <span className="pulse-soft grid size-9 place-items-center rounded-xl bg-gold-tint text-gold-ink">
          <Icon icon={BellRing} anim="wiggle" className="size-4.5" />
        </span>
        <span className="text-left">
          <span className="block text-[13px] font-semibold text-ink">3 clients à relancer</span>
          <span className="block text-[11px] text-slate">Vous avez 10 jours pour les retenir.</span>
        </span>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: DURATION.screen * 2, ease: EASE_OUT, delay: 0.35 }}
        className="rounded-[26px] border border-white/70 bg-white/55 p-1.5 shadow-float backdrop-blur-sm sm:p-2 xl:mr-36"
        role="region"
        aria-label="Aperçu interactif du tableau de bord SaasClair"
      >
        <div className="overflow-hidden rounded-[20px] border border-line bg-white [mask-image:linear-gradient(to_bottom,black_86%,transparent)]">
          {/* Barre du navigateur */}
          <div
            className="flex h-10 items-center gap-2 border-b border-line bg-paper px-4"
            aria-hidden
          >
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="size-2.5 rounded-full bg-line" />
            <span className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[11px] text-slate">
              <Lock className="size-3" /> app.saasclair.fr
            </span>
          </div>

          <div className="flex">
            {/* Barre latérale vert forêt : chaque entrée ouvre son écran */}
            <aside className="hidden w-52 shrink-0 flex-col gap-1 bg-forest p-4 md:flex">
              <Logo variant="inverse" className="mb-5 h-5 min-w-0" />
              <span className="mb-3 rounded-xl bg-white/8 px-3 py-2 text-[11px] text-cream/85">
                Projet actif
                <span className="block text-[13px] font-semibold text-cream">monsaas.fr</span>
              </span>
              <nav aria-label="Écrans de l'aperçu" className="flex flex-col gap-1">
                {NAV.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => open(id)}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-emerald",
                      view === id
                        ? "font-semibold text-cream"
                        : "text-cream/75 hover:bg-white/6 hover:text-cream",
                    )}
                  >
                    {view === id && (
                      <m.span
                        layoutId="hero-nav-active"
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl bg-white/12"
                      />
                    )}
                    <span className="relative">
                      <Icon icon={icon} anim="pop" className="size-4" />
                    </span>
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </nav>
              {!hasExplored && (
                <p className="mt-3 flex items-center gap-1.5 px-3 text-[11px] font-semibold text-cream/85">
                  <Icon icon={MousePointerClick} anim="bounce" className="size-3.5" />
                  Cliquez pour explorer
                </p>
              )}
              <span className="mt-auto rounded-xl border border-cream/10 p-3 text-[11px] text-cream/85">
                <span className="font-semibold text-cream">91 %</span> de vos clients reliés à leur
                provenance
              </span>
            </aside>

            <div className="min-w-0 flex-1 bg-cream/60">
              {/* Sur mobile, la barre latérale laisse place à des onglets */}
              <nav
                aria-label="Écrans de l'aperçu"
                className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line bg-white px-3 py-2 md:hidden"
              >
                {NAV.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => open(id)}
                    className={cn(
                      "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink",
                      view === id ? "bg-forest text-cream" : "text-slate hover:text-forest",
                    )}
                  >
                    <Icon icon={icon} anim="pop" className="size-3.5" />
                    {label}
                  </button>
                ))}
              </nav>

              <div className="relative min-h-[430px] p-4 sm:min-h-[470px] sm:p-6">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={view}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: DURATION.micro, ease: EASE_OUT }}
                    aria-live="polite"
                  >
                    {VIEWS[view]}
                  </m.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </m.div>

      <HeroPhone className="absolute -right-12 -bottom-6 z-10 hidden xl:block" />
    </div>
  );
}
