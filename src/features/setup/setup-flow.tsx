"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { SetupProgress } from "./setup-progress";
import { StepDone } from "./step-done";
import { StepScript } from "./step-script";
import { StepSite } from "./step-site";
import { StepStripe } from "./step-stripe";
import { SETUP_STEPS, type SetupState, type SetupStep } from "./steps";

const SLIDE = 48;

/** Orchestre les étapes : chaque carte glisse vers la suivante, l'avancement est enregistré. */
export function SetupFlow({ initial }: { initial: SetupState }) {
  const [state, setState] = useState(initial);
  const [direction, setDirection] = useState(1);

  const goTo = (step: SetupStep) => {
    setDirection(SETUP_STEPS.indexOf(step) >= SETUP_STEPS.indexOf(state.step) ? 1 : -1);
    setState((current) => ({ ...current, step }));
  };

  return (
    <div className="flex w-full flex-col items-center gap-8 sm:gap-10">
      <SetupProgress step={state.step} />
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <m.section
            key={state.step}
            custom={direction}
            variants={{
              enter: (dir: number) => ({ opacity: 0, x: dir * SLIDE }),
              center: { opacity: 1, x: 0 },
              exit: (dir: number) => ({ opacity: 0, x: dir * -SLIDE }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: DURATION.screen, ease: EASE_OUT }}
            aria-live="polite"
          >
            {state.step === "site" && (
              <StepSite
                firstName={state.firstName}
                defaultSite={state.siteUrl}
                previousAudit={state.audit}
                onDone={(result) => {
                  setState((current) => ({
                    ...current,
                    ...result,
                    siteKey: result.siteKey || current.siteKey,
                  }));
                  goTo("script");
                }}
              />
            )}
            {state.step === "script" && (
              <StepScript
                siteKey={state.siteKey ?? ""}
                siteUrl={state.siteUrl}
                onBack={() => goTo("site")}
                onDone={() => goTo("stripe")}
              />
            )}
            {state.step === "stripe" && <StepStripe onDone={() => goTo("done")} />}
            {state.step === "done" && <StepDone siteUrl={state.siteUrl} />}
          </m.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
