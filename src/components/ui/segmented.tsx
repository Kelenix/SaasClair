"use client";

import { m } from "motion/react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: string; count?: number };

/** Choix exclusif en pilules : la pastille blanche glisse vers l'option choisie. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  pillId,
  className,
}: {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Identifiant unique de la pastille (deux groupes ne doivent pas partager le même). */
  pillId: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-1 rounded-3xl bg-sand p-1", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap text-slate transition-colors outline-none hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink aria-pressed:text-forest"
        >
          {value === option.value && (
            <m.span
              layoutId={pillId}
              transition={SPRING}
              className="absolute inset-0 rounded-full bg-white shadow-card"
            />
          )}
          <span className="relative">{option.label}</span>
          {option.count !== undefined && (
            <span className="relative rounded-full bg-cream px-1.5 text-xs tabular-nums">
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
