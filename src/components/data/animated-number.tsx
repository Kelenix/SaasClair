"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { formatters, type NumberFormat } from "@/lib/format";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type AnimatedNumberProps = {
  value: number;
  format?: NumberFormat;
  className?: string;
};

/**
 * Compteur qui défile de sa valeur précédente (0 au départ) jusqu'à `value` dès qu'il est visible.
 * Le texte est mis à jour directement dans le DOM : aucun rendu React à chaque image.
 */
export function AnimatedNumber({ value, format = "number", className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const toText = formatters[format];

  useEffect(() => {
    const node = ref.current;
    if (!node || !isInView) return;
    if (prefersReducedMotion) {
      node.textContent = toText(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration: DURATION.data * 1.2,
      ease: EASE_OUT,
      onUpdate: (latest) => (node.textContent = toText(latest)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, isInView, prefersReducedMotion, toText]);

  return (
    <span className={cn("tabular-nums", className)}>
      <span className="sr-only">{toText(value)}</span>
      <span ref={ref} aria-hidden>
        {toText(0)}
      </span>
    </span>
  );
}
