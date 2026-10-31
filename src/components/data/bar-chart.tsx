"use client";

import { m } from "motion/react";
import { formatters, type NumberFormat } from "@/lib/format";
import { growY, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Bar = { label: string; value: number; highlight?: boolean };

type BarChartProps = {
  bars: Bar[];
  format?: NumberFormat;
  className?: string;
};

/** Barres verticales qui poussent depuis la base, l'une après l'autre. */
export function BarChart({ bars, format = "number", className }: BarChartProps) {
  const max = Math.max(...bars.map((bar) => bar.value)) || 1;
  return (
    <m.ul
      className={cn("flex h-40 items-end gap-2 sm:gap-3", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      {bars.map((bar, index) => (
        <li key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[11px] font-semibold text-slate tabular-nums">
            {formatters[format](bar.value)}
          </span>
          <m.span
            aria-hidden
            className={cn(
              "w-full max-w-10 origin-bottom rounded-t-lg",
              bar.highlight ? "bg-gold" : "bg-emerald",
            )}
            style={{ height: `${(bar.value / max) * 100}%` }}
            variants={growY}
            custom={index * STAGGER}
          />
          <span className="text-xs text-slate">{bar.label}</span>
        </li>
      ))}
    </m.ul>
  );
}
