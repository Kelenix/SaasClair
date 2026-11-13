"use client";

import Link from "next/link";
import { m } from "motion/react";
import { ArrowDown, ArrowRight, Sparkles, Target } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber, formatPercent } from "@/lib/format";
import { cascade, DURATION, EASE_OUT, fadeUp, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { FunnelStep, Insight } from "../demo-data";
import { weakestCell, type Comparison } from "./data";

/** Tunnel visuel : chaque étape s'élargit depuis le centre, la perte entre deux étapes est chiffrée. */
/** Étape du tunnel ; le repère « habituel » n'existe qu'en démonstration (jamais inventé). */
type ChartStep = Omit<FunnelStep, "benchmark"> & { benchmark?: number };

export function FunnelChart({ funnel, weakest }: { funnel: ChartStep[]; weakest: number }) {
  const max = funnel[0].count || 1;
  return (
    <Card>
      <CardEyebrow>Tunnel de conversion</CardEyebrow>
      <p className="mb-6 font-serif text-xl font-semibold text-forest">
        De la visite au paiement, étape par étape.
      </p>
      <m.ol
        variants={cascade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mx-auto max-w-3xl"
      >
        {funnel.map((step, index) => {
          const isWeakest = index === weakest;
          const previous = funnel[index - 1];
          const passRate = previous ? (previous.count ? step.count / previous.count : 0) : 1;
          return (
            <m.li key={step.id} variants={fadeUp}>
              {previous && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate">
                  <Icon icon={ArrowDown} anim="bounce" className="size-3.5" />
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold tabular-nums",
                      isWeakest ? "pulse-soft bg-gold-tint text-gold-ink" : "bg-sand text-slate",
                    )}
                  >
                    −{formatPercent((1 - passRate) * 100, 0)}
                  </span>
                  <span className="tabular-nums">
                    {formatNumber(previous.count - step.count)} perdus
                    {step.benchmark !== undefined &&
                      ` · habituel −${formatPercent((1 - step.benchmark) * 100, 0)}`}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 sm:grid-cols-[8rem_1fr_6rem]">
                <span className="text-sm font-semibold text-ink">{step.label}</span>
                <div className="flex h-11 items-center justify-center">
                  <m.span
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: DURATION.data,
                      ease: EASE_OUT,
                      delay: 0.15 + index * STAGGER * 2,
                    }}
                    className={cn("block h-full rounded-xl", isWeakest ? "bg-gold" : "bg-emerald")}
                    style={{ width: `${Math.max(4, Math.sqrt(step.count / max) * 100)}%` }}
                  />
                </div>
                <span className="text-right">
                  <span className="block font-serif text-lg font-semibold text-forest tabular-nums">
                    {formatNumber(step.count)}
                  </span>
                  {previous && (
                    <span className="block text-[11px] text-slate tabular-nums">
                      {formatPercent(passRate * 100)} passent
                    </span>
                  )}
                </span>
              </div>
            </m.li>
          );
        })}
      </m.ol>
      <p className="mt-5 text-center text-xs text-slate">
        Largeur des barres adoucie pour garder les petites étapes lisibles. Les chiffres, eux, sont
        exacts.
      </p>
    </Card>
  );
}

/** L'étape qui perd le plus : constat, cause probable et action, avec le lien vers l'insight. */
export function WeakestStepCard({
  step,
  previous,
  cause,
}: {
  step: FunnelStep;
  previous: FunnelStep;
  cause: Insight;
}) {
  const rate = step.count / previous.count;
  return (
    <Card className="flex h-full flex-col border-gold/60">
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardEyebrow className="mb-0">Étape à corriger en premier</CardEyebrow>
        <Badge tone="attention" pulse>
          {step.label}
        </Badge>
      </div>
      <p className="mb-3 font-serif text-xl font-semibold text-forest">
        {formatPercent(rate * 100)} des {previous.label.toLowerCase()}s atteignent l&apos;étape «{" "}
        {step.label} », contre {formatPercent(step.benchmark * 100, 0)} d&apos;habitude.
      </p>
      <p className="mb-4 text-sm text-ink">{cause.finding}</p>
      <dl className="mb-5 space-y-3 text-sm">
        <div>
          <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate">
            <Icon icon={Target} className="size-3.5" /> Cause probable
          </dt>
          <dd className="text-ink">{cause.cause}</dd>
        </div>
        <div className="rounded-xl border-l-4 border-gold bg-cream px-3.5 py-2.5">
          <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-gold-ink">
            <Icon icon={Sparkles} anim="pop" className="size-3.5" /> Action recommandée
          </dt>
          <dd className="text-ink">{cause.action}</dd>
        </div>
      </dl>
      <p className="mt-auto text-sm">
        Impact estimé : <strong className="text-forest">{cause.impact}</strong>
      </p>
      <Link
        href="/app/insights"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md text-sm font-semibold text-forest underline-offset-4 hover:underline"
      >
        Suivre cet insight <Icon icon={ArrowRight} anim="nudge" className="size-4" />
      </Link>
    </Card>
  );
}

const STEP_LABELS = ["Inscription", "Activation", "Essai", "Paiement"];

/** Comparaison par appareil, pays et canal : la case la plus en retard est mise en évidence en or. */
export function SegmentComparison({
  comparisons,
  overall,
}: {
  comparisons: Comparison[];
  overall: number[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <Tabs defaultValue={comparisons[0]?.id} className="gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
          <div>
            <CardEyebrow>Comparaison</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              Taux de passage à chaque étape.
            </p>
          </div>
          <TabsList aria-label="Comparer par">
            {comparisons.map((comparison) => (
              <TabsTrigger key={comparison.id} value={comparison.id}>
                {comparison.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {comparisons.map((comparison) => {
          const worst = weakestCell(comparison.segments, overall);
          const worstSegment = comparison.segments[worst.segment];
          return (
            <TabsContent key={comparison.id} value={comparison.id}>
              <div className="hidden @3xl:block">
                <table className="w-full text-sm tabular-nums">
                  <thead className="border-y border-line bg-cream/60 text-xs text-slate">
                    <tr>
                      <th scope="col" className="py-3 pl-6 text-left font-semibold">
                        {comparison.label}
                      </th>
                      <th scope="col" className="py-3 text-right font-semibold">
                        Visites
                      </th>
                      {STEP_LABELS.map((label) => (
                        <th key={label} scope="col" className="py-3 text-right font-semibold">
                          → {label}
                        </th>
                      ))}
                      <th scope="col" className="py-3 pr-6 text-right font-semibold">
                        Visite → client
                      </th>
                    </tr>
                  </thead>
                  <m.tbody variants={cascade} initial="hidden" animate="show">
                    {comparison.segments.map((segment, row) => {
                      const global = segment.rates.reduce((product, value) => product * value, 1);
                      return (
                        <m.tr
                          key={segment.id}
                          variants={fadeUp}
                          className="border-b border-line last:border-0"
                        >
                          <th scope="row" className="py-3.5 pl-6 text-left font-semibold text-ink">
                            {segment.name}
                          </th>
                          <td className="py-3.5 text-right text-slate">
                            {formatPercent(segment.share * 100, 0)}
                          </td>
                          {segment.rates.map((value, step) => {
                            const isWorst = row === worst.segment && step === worst.step;
                            return (
                              <td key={step} className="py-2 text-right">
                                <span
                                  className={cn(
                                    "inline-block rounded-lg px-2 py-1",
                                    isWorst
                                      ? "pulse-soft bg-gold-tint font-semibold text-gold-ink"
                                      : value < overall[step]
                                        ? "text-ink"
                                        : "text-emerald-ink",
                                  )}
                                >
                                  {formatPercent(value * 100)}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3.5 pr-6 text-right font-semibold text-forest">
                            {formatPercent(global * 100, 2)}
                          </td>
                        </m.tr>
                      );
                    })}
                  </m.tbody>
                </table>
              </div>
              <m.ul
                className="space-y-3 px-4 @3xl:hidden"
                variants={cascade}
                initial="hidden"
                animate="show"
              >
                {comparison.segments.map((segment, row) => (
                  <m.li
                    key={segment.id}
                    variants={fadeUp}
                    className="rounded-2xl border border-line bg-white p-4"
                  >
                    <p className="mb-3 flex items-baseline justify-between gap-3">
                      <span className="font-semibold text-ink">{segment.name}</span>
                      <span className="text-xs text-slate tabular-nums">
                        {formatPercent(segment.share * 100, 0)} des visites
                      </span>
                    </p>
                    <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums">
                      {segment.rates.map((value, step) => {
                        const isWorst = row === worst.segment && step === worst.step;
                        return (
                          <div
                            key={step}
                            className={cn(
                              "rounded-xl px-3 py-2",
                              isWorst ? "pulse-soft bg-gold-tint text-gold-ink" : "bg-cream",
                            )}
                          >
                            <dt className="text-xs text-slate">→ {STEP_LABELS[step]}</dt>
                            <dd className="font-semibold">{formatPercent(value * 100)}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </m.li>
                ))}
              </m.ul>
              {worstSegment && (
                <p className="mx-6 my-5 rounded-xl border-l-4 border-gold bg-cream px-3.5 py-2.5 text-sm text-ink">
                  <strong className="text-forest">{worstSegment.name} :</strong>{" "}
                  {formatPercent(worstSegment.rates[worst.step] * 100)} passent à l&apos;étape «{" "}
                  {STEP_LABELS[worst.step].toLowerCase()} », contre{" "}
                  {formatPercent(overall[worst.step] * 100)} en moyenne.
                </p>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
