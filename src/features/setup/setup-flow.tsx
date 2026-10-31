"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { skipSetup } from "./actions";
import { SetupProgress } from "./setup-progress";
import { StepDone } from "./step-done";
import { StepScript } from "./step-script";
import { StepSite } from "./step-site";
import { StepStripe } from "./step-stripe";
import { nextStep, SETUP_STEPS, type ActionStep, type SetupState, type SetupStep } from "./steps";

const SLIDE = 48;

/**
 * Orchestre les étapes : chaque carte glisse vers la suivante, l'avancement est enregistré.
 * Chaque étape peut être passée ; après la dernière, le tableau de bord rappelle ce qui reste.
 */
export function SetupFlow({ initial }: { initial: SetupState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [direction, setDirection] = useState(1);
  const [isSkipping, startSkipping] = useTransition();

  const goTo = (step: SetupStep) => {
    setDirection(SETUP_STEPS.indexOf(step) >= SETUP_STEPS.indexOf(state.step) ? 1 : -1);
    setState((current) => ({ ...current, step }));
    // Chaque étape s'ouvre par son titre, pas là où l'on avait cliqué sur l'étape précédente.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  // Après l'étape `from` (faite ou passée) : l'étape suivante à faire, l'écran final, ou le
  // tableau de bord s'il reste des étapes passées.
  const advance = (from: ActionStep, completed: SetupState["completed"]) => {
    const next = nextStep(from, completed);
    if (next === "later") router.push("/app");
    else goTo(next);
  };

  const complete = (step: ActionStep) => {
    const completed = { ...state.completed, [step]: true };
    setState((current) => ({ ...current, completed }));
    advance(step, completed);
  };

  const skip = (step: ActionStep) =>
    startSkipping(async () => {
      const result = await skipSetup();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setState((current) => ({ ...current, siteKey: current.siteKey ?? result.data.siteKey }));
      advance(step, state.completed);
    });

  // Étape « script » ouverte depuis le tableau de bord avant que le projet existe : il faut sa
  // clé pour afficher la ligne à installer.
  const needsSiteKey = state.step === "script" && !state.siteKey;
  useEffect(() => {
    if (!needsSiteKey) return;
    skipSetup().then((result) => {
      if (result.ok) setState((current) => ({ ...current, siteKey: result.data.siteKey }));
    });
  }, [needsSiteKey]);

  const currentAction = state.step === "done" ? null : state.step;

  return (
    <div className="flex w-full flex-col items-center gap-8 sm:gap-10">
      <SetupProgress step={state.step} completed={state.completed} />
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
                  complete("site");
                }}
              />
            )}
            {state.step === "script" && (
              <StepScript
                siteKey={state.siteKey ?? ""}
                siteUrl={state.siteUrl}
                technologies={state.audit?.technologies ?? []}
                demo={state.demo}
                onBack={() => goTo("site")}
                onDone={() => complete("script")}
              />
            )}
            {state.step === "stripe" && (
              <StepStripe
                available={state.stripeAvailable}
                demo={state.demo}
                result={state.stripeResult}
                onDone={() => complete("stripe")}
              />
            )}
            {state.step === "done" && <StepDone siteUrl={state.siteUrl} />}

            {currentAction && (
              <div className="mt-5 flex flex-col items-center gap-1 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => skip(currentAction)}
                  disabled={isSkipping}
                  data-icon-trigger
                >
                  Passer cette étape <Icon icon={ArrowRight} anim="nudge" />
                </Button>
                <p className="text-[13px] text-slate">
                  Vous pourrez la faire plus tard depuis votre tableau de bord.
                </p>
              </div>
            )}
          </m.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
