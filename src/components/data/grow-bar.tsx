"use client";

import { m } from "motion/react";
import { growX } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TONES = { forest: "bg-forest", emerald: "bg-emerald", gold: "bg-gold" } as const;

/** Barre horizontale qui pousse depuis la gauche à son apparition. */
export function GrowBar({
  share,
  delay = 0,
  tone = "emerald",
}: {
  /** Longueur en % de la piste. */
  share: number;
  delay?: number;
  tone?: keyof typeof TONES;
}) {
  return (
    <m.span
      className="block h-2 overflow-hidden rounded-full bg-sand"
      aria-hidden
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
    >
      <m.span
        className={cn("block h-full origin-left rounded-full", TONES[tone])}
        style={{ width: `${share}%` }}
        variants={growX}
        custom={delay}
      />
    </m.span>
  );
}
