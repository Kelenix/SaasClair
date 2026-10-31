"use client";

import { m, type Variants } from "motion/react";
import { Card, CardEyebrow } from "@/components/ui/card";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { Cohort } from "./data";

// Chaque case apparaît en diagonale, de la plus ancienne valeur à la plus récente.
const cell: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  show: (delay: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.screen, ease: EASE_OUT, delay },
  }),
};

/** Teinte émeraude proportionnelle à la rétention (texte forêt foncé : contraste AA partout). */
const shade = (retention: number) => {
  const intensity = Math.min(1, Math.max(0, (retention - 35) / 65));
  return `color-mix(in oklab, var(--emerald) ${Math.round(10 + intensity * 85)}%, white)`;
};

/** Tableau de rétention par cohorte : une carte de chaleur qui apparaît case par case. */
export function CohortHeatmap({ cohorts }: { cohorts: Cohort[] }) {
  const months = cohorts[0]?.retention.length ?? 0;
  const oldest = cohorts[0];
  const recent = cohorts.findLast((cohort) => cohort.retention.length > 3);

  return (
    <Card className="min-w-0">
      <CardEyebrow>Rétention par cohorte</CardEyebrow>
      <p className="mb-1 font-serif text-xl font-semibold text-forest">
        Vos nouveaux clients restent plus longtemps.
      </p>
      {oldest && recent && oldest !== recent && (
        <p className="mb-5 text-sm text-slate">
          Au 3ᵉ mois, {recent.retention[3]} % des clients arrivés en {recent.label} sont encore là,
          contre {oldest.retention[3]} % pour ceux de {oldest.label}.
        </p>
      )}
      <div
        className="-mx-6 overflow-x-auto rounded-lg px-6 pb-1 outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink"
        tabIndex={0}
        role="region"
        aria-label="Tableau de rétention par cohorte, défilable"
      >
        <m.table
          className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-xs tabular-nums"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <caption className="sr-only">
            Part des clients encore abonnés, mois après mois, pour chaque mois d&apos;arrivée
          </caption>
          <thead>
            <tr className="text-slate">
              <th scope="col" className="sticky left-0 z-10 bg-white pr-2 text-left font-semibold">
                Arrivés en
              </th>
              <th scope="col" className="px-1 font-semibold">
                Clients
              </th>
              {Array.from({ length: months }, (_, month) => (
                <th key={month} scope="col" className="px-1 font-semibold whitespace-nowrap">
                  Mois {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort, row) => (
              <tr key={cohort.label}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white pr-2 text-left font-semibold whitespace-nowrap text-ink"
                >
                  {cohort.label}
                </th>
                <td className="px-1 text-slate">{cohort.size}</td>
                {Array.from({ length: months }, (_, month) => {
                  const value = cohort.retention[month];
                  return value === undefined ? (
                    <td key={month} aria-hidden />
                  ) : (
                    <m.td
                      key={month}
                      variants={cell}
                      custom={(row + month) * 0.035}
                      className="h-10 min-w-12 rounded-lg font-semibold text-forest-deep"
                      style={{ backgroundColor: shade(value) }}
                    >
                      {value} %
                    </m.td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </m.table>
      </div>
      <p className="mt-3 text-xs text-slate">
        Part des clients encore abonnés, mois après mois. Plus la case est verte, mieux c&apos;est.
      </p>
    </Card>
  );
}
