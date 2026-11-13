"use client";

import { m } from "motion/react";
import { Card, CardEyebrow } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { growY, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { RevenueBucket } from "../demo-data";

const PLOT_HEIGHT = 170;

const SERIES = [
  { key: "newMrr", label: "Nouveaux clients", className: "bg-emerald" },
  { key: "expansion", label: "Expansion", className: "bg-forest" },
  { key: "lost", label: "Perdu (départs et baisses d'offre)", className: "bg-gold" },
] as const;

/**
 * Évolution du revenu : nouveau et expansion poussent vers le haut, le perdu descend sous la
 * ligne. Une même échelle pour les deux sens, pour ne jamais tromper sur les proportions.
 */
export function RevenueChart({ buckets }: { buckets: RevenueBucket[] }) {
  const maxUp = Math.max(...buckets.map((bucket) => bucket.newMrr + bucket.expansion));
  const lostOf = (bucket: RevenueBucket) => bucket.lost + bucket.contraction;
  const maxDown = Math.max(...buckets.map(lostOf));
  // Période sans mouvement : barres à zéro, jamais une division par zéro.
  const unit = PLOT_HEIGHT / Math.max(maxUp, maxDown * 1.6, 1);
  const totals = buckets.reduce(
    (sum, bucket) => ({
      won: sum.won + bucket.newMrr + bucket.expansion,
      lost: sum.lost + lostOf(bucket),
    }),
    { won: 0, lost: 0 },
  );
  const net = totals.won - totals.lost;

  return (
    <Card className="flex h-full min-w-0 flex-col">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <CardEyebrow>Évolution du revenu</CardEyebrow>
          <p className="font-serif text-2xl font-semibold text-forest">
            {net >= 0 ? "+" : "−"}
            {formatEuro(Math.abs(net))} de revenu mensuel net
          </p>
          <p className="text-[13px] text-slate">
            {formatEuro(totals.won)} gagnés · {formatEuro(totals.lost)} perdus sur la période
          </p>
        </div>
        <ul className="flex flex-wrap gap-3 text-[12px] text-slate">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-sm", series.className)} aria-hidden />
              {series.label}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="-mx-2 overflow-x-auto rounded-lg px-2 pb-1 outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink"
        tabIndex={0}
        role="region"
        aria-label="Graphique de l'évolution du revenu, défilable"
      >
        <m.div
          className="flex min-w-[460px] items-stretch gap-1.5 sm:gap-2.5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          aria-hidden
        >
          {buckets.map((bucket, index) => (
            <div
              key={bucket.label + index}
              className="group flex flex-1 flex-col items-center"
              title={`${bucket.label} : +${formatEuro(bucket.newMrr)} nouveaux, +${formatEuro(bucket.expansion)} expansion, −${formatEuro(lostOf(bucket))} perdus`}
            >
              <div
                className="flex w-full max-w-9 flex-col justify-end"
                style={{ height: PLOT_HEIGHT }}
              >
                <m.div
                  variants={growY}
                  custom={index * STAGGER}
                  className="flex origin-bottom flex-col overflow-hidden rounded-t-md"
                >
                  <span className="block bg-forest" style={{ height: bucket.expansion * unit }} />
                  <span className="block bg-emerald" style={{ height: bucket.newMrr * unit }} />
                </m.div>
              </div>
              <span className="h-px w-full bg-ink/20" />
              <div className="w-full max-w-9" style={{ height: maxDown * unit }}>
                <m.span
                  variants={growY}
                  custom={index * STAGGER + 0.15}
                  className="block origin-top rounded-b-md bg-gold"
                  style={{ height: lostOf(bucket) * unit }}
                />
              </div>
              <span className="mt-2 text-[11px] whitespace-nowrap text-slate">{bucket.label}</span>
            </div>
          ))}
        </m.div>
      </div>

      {/* Un tableau ignore la largeur de sr-only : on masque son conteneur. */}
      <div className="sr-only">
        <table>
          <caption>Évolution du revenu par période</caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">Nouveaux clients</th>
              <th scope="col">Expansion</th>
              <th scope="col">Perdu</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket, index) => (
              <tr key={bucket.label + index}>
                <th scope="row">{bucket.label}</th>
                <td>{formatEuro(bucket.newMrr)}</td>
                <td>{formatEuro(bucket.expansion)}</td>
                <td>{formatEuro(lostOf(bucket))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
