"use client";

import { m } from "motion/react";
import { growX } from "@/lib/motion";
import { cn } from "@/lib/utils";

const HIGH_RISK = 70;

type RiskMeterProps = {
  /** Score de risque de 0 à 100. */
  score: number;
  className?: string;
};

/** Jauge de risque qui se remplit (or ; orangé au-delà de 70) — comme le brand kit. */
export function RiskMeter({ score, className }: RiskMeterProps) {
  return (
    <m.span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={`Risque de départ : ${score} sur 100`}
      className={cn("block h-1.5 w-24 overflow-hidden rounded-full bg-sand", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <m.span
        className={cn(
          "block h-full origin-left rounded-full",
          score >= HIGH_RISK ? "bg-risk-high" : "bg-gold",
        )}
        style={{ width: `${score}%` }}
        variants={growX}
      />
    </m.span>
  );
}
