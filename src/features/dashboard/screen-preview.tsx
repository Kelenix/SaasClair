"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT, growX, growY, STAGGER } from "@/lib/motion";

// Aperçu dessiné d'un écran encore vide : des formes, jamais de chiffres (règle « aucune donnée
// de test en production »). Il montre ce que l'écran affichera, et s'anime comme lui.

export type PreviewKind = "revenue" | "churn" | "acquisition" | "funnel" | "insights";

/** Un trait gris qui tient la place d'un texte. */
const Line = ({ className }: { className?: string }) => (
  <span className={cn("block h-2 rounded-full bg-line", className)} />
);

function KpiRow() {
  return (
    <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="rounded-2xl border border-line bg-white p-4">
          <Line className="mb-3 w-2/3" />
          <span className="mb-3 block h-5 w-1/2 rounded-md bg-forest/15" />
          <svg viewBox="0 0 100 24" className="h-6 w-full" aria-hidden>
            <m.path
              d={
                index % 2
                  ? "M0 18 L20 15 L40 16 L60 10 L80 9 L100 5"
                  : "M0 20 L20 17 L40 12 L60 13 L80 7 L100 4"
              }
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={index === 2 ? "stroke-gold" : "stroke-emerald"}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: DURATION.data, ease: EASE_OUT, delay: index * STAGGER }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

function LineChart() {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <Line className="mb-4 w-1/4" />
      <svg viewBox="0 0 300 90" className="h-32 w-full" preserveAspectRatio="none" aria-hidden>
        {[20, 45, 70].map((y) => (
          <line key={y} x1="0" x2="300" y1={y} y2={y} className="stroke-line" strokeWidth="1" />
        ))}
        <m.path
          d="M0 75 C40 70 60 62 90 58 S150 45 180 40 S240 22 300 12"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-emerald"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: DURATION.data, ease: EASE_OUT }}
        />
      </svg>
    </div>
  );
}

function BarRows({ count, tone }: { count: number; tone: "emerald" | "gold" }) {
  const widths = [92, 74, 58, 41, 27, 18];
  return (
    <m.div
      className="space-y-3 rounded-2xl border border-line bg-white p-4"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {widths.slice(0, count).map((width, index) => (
        <div key={width} className="grid grid-cols-[1fr_2fr] items-center gap-3">
          <Line className={index % 2 ? "w-3/4" : "w-full"} />
          <span className="block h-2.5 overflow-hidden rounded-full bg-sand">
            <m.span
              variants={growX}
              custom={index * STAGGER}
              className={cn(
                "block h-full origin-left rounded-full",
                tone === "gold" && index < 2 ? "bg-gold" : "bg-emerald",
              )}
              style={{ width: `${width}%` }}
            />
          </span>
        </div>
      ))}
    </m.div>
  );
}

function Funnel() {
  const heights = [100, 72, 46, 30, 18];
  return (
    <m.div
      className="flex h-44 items-end gap-3 rounded-2xl border border-line bg-white p-4"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {heights.map((height, index) => (
        <div key={height} className="flex h-full flex-1 flex-col justify-end gap-2">
          <m.span
            variants={growY}
            custom={index * STAGGER}
            className={cn(
              "block origin-bottom rounded-t-xl",
              index === 2 ? "bg-gold" : "bg-emerald/70",
            )}
            style={{ height: `${height}%` }}
          />
          <Line />
        </div>
      ))}
    </m.div>
  );
}

function InsightCards() {
  return (
    <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-line bg-white p-4">
          <span className="block h-5 w-20 rounded-full bg-emerald-tint" />
          <span className="block h-4 w-5/6 rounded-md bg-forest/15" />
          <Line />
          <Line className="w-4/5" />
          <span className="block h-8 w-1/2 rounded-full bg-gold-tint" />
        </div>
      ))}
    </div>
  );
}

const DRAWINGS: Record<PreviewKind, React.ReactNode> = {
  revenue: (
    <>
      <KpiRow />
      <LineChart />
    </>
  ),
  churn: (
    <>
      <KpiRow />
      <BarRows count={4} tone="gold" />
    </>
  ),
  acquisition: (
    <>
      <KpiRow />
      <BarRows count={6} tone="emerald" />
    </>
  ),
  funnel: <Funnel />,
  insights: <InsightCards />,
};

/** Dessin de l'écran, clairement étiqueté : ce n'est pas encore le vôtre. */
export function ScreenPreview({ kind, label }: { kind: PreviewKind; label: string }) {
  return (
    <figure className="@container relative overflow-hidden rounded-card border border-dashed border-forest/25 bg-cream/70 p-4 sm:p-5">
      <figcaption className="mb-4 inline-flex items-center rounded-full bg-forest px-3 py-1 text-xs font-semibold tracking-wide text-cream">
        À quoi ressemblera cet écran
      </figcaption>
      <p className="sr-only">{label}</p>
      <div className="pointer-events-none space-y-3 opacity-80 select-none" aria-hidden>
        {DRAWINGS[kind]}
      </div>
    </figure>
  );
}
