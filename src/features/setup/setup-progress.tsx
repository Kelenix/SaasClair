"use client";

import { m } from "motion/react";
import { Check } from "lucide-react";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ActionStep, SetupStep } from "./steps";

const MILESTONES: { step: ActionStep; label: string }[] = [
  { step: "site", label: "Votre SaaS" },
  { step: "script", label: "Installer le script" },
  { step: "stripe", label: "Connecter Stripe" },
];

const PROGRESS: Record<SetupStep, number> = { site: 0.12, script: 0.45, stripe: 0.78, done: 1 };

const CAPTION: Record<SetupStep, string> = {
  site: "Avant de commencer",
  script: "Étape 1 sur 2",
  stripe: "Étape 2 sur 2",
  done: "Terminé",
};

/** Barre de progression animée : « Étape 1 sur 2 », « Étape 2 sur 2 ». Une étape passée n'est pas cochée. */
export function SetupProgress({
  step,
  completed,
}: {
  step: SetupStep;
  completed: Record<ActionStep, boolean>;
}) {
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-2.5 flex items-center justify-between text-[13px]">
        <m.span
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-semibold text-forest"
        >
          {CAPTION[step]}
        </m.span>
        <ol className="hidden items-center gap-5 sm:flex" aria-label="Étapes de la configuration">
          {MILESTONES.map(({ step: milestone, label }, index) => {
            const isDone = step === "done" || completed[milestone];
            return (
              <li
                key={milestone}
                aria-current={step === milestone ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5",
                  step === milestone ? "font-semibold text-forest" : "text-slate",
                )}
              >
                <span
                  className={cn(
                    "grid size-4.5 place-items-center rounded-full border text-[10px]",
                    isDone ? "border-emerald bg-emerald text-forest-deep" : "border-line bg-white",
                  )}
                >
                  {isDone ? (
                    <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}>
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </m.span>
                  ) : (
                    index
                  )}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
      </div>
      <div
        role="progressbar"
        aria-label="Avancement de la configuration"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(PROGRESS[step] * 100)}
        className="h-2 overflow-hidden rounded-full bg-sand"
      >
        <m.span
          className="block h-full origin-left rounded-full bg-emerald"
          initial={false}
          animate={{ scaleX: PROGRESS[step] }}
          transition={{ duration: DURATION.screen * 2, ease: EASE_OUT }}
        />
      </div>
    </div>
  );
}
