"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import {
  Check,
  CreditCard,
  Link2,
  LoaderCircle,
  Lock,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { connectStripe } from "./actions";

type Phase = "idle" | "connecting" | "importing" | "linking" | "linked";

// Démonstration : import du compte Stripe de Nadia (≈ 340 clients, 12 mois d'historique).
const IMPORTED: { icon: LucideIcon; label: string; value: number }[] = [
  { icon: Users, label: "Clients", value: 340 },
  { icon: Receipt, label: "Paiements", value: 3912 },
  { icon: CreditCard, label: "Abonnements", value: 352 },
];
const COVERAGE = 91;
const PHASE_DURATION_MS: Partial<Record<Phase, number>> = {
  importing: 2400,
  linking: 2200,
  linked: 1800,
};
const NEXT_PHASE: Partial<Record<Phase, Phase>> = { importing: "linking", linking: "linked" };

export function StepStripe({ demo, onDone }: { demo: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  // Hors données d'exemple : pas d'import inventé, la connexion réelle n'est pas encore ouverte.
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isOtherProviderOpen, setIsOtherProviderOpen] = useState(false);
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    const duration = PHASE_DURATION_MS[phase];
    if (!duration) return;
    const timer = setTimeout(() => {
      const next = NEXT_PHASE[phase];
      if (next) setPhase(next);
      else finish();
    }, duration);
    return () => clearTimeout(timer);
  }, [phase]);

  async function connect() {
    if (!demo) {
      setIsUnavailable(true);
      return;
    }
    setPhase("connecting");
    const result = await connectStripe();
    if (!result.ok) {
      toast.error(result.message);
      setPhase("idle");
      return;
    }
    setPhase("importing");
  }

  const isImporting = phase !== "idle" && phase !== "connecting";

  return (
    <Card className="p-6 sm:p-10">
      <p className="eyebrow">Action 2 · environ 1 minute</p>
      <h1 className="mb-2 text-[30px] sm:text-[38px]">Connectez Stripe.</h1>
      <p className="mb-7 text-[15px] text-slate">
        Vos paiements, abonnements et résiliations, reliés automatiquement à leur provenance.
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {!isImporting ? (
          <m.div
            key="connect"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DURATION.micro }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <Button
              size="lg"
              onClick={connect}
              disabled={phase === "connecting"}
              className="h-16 w-full max-w-sm bg-stripe text-lg text-white hover:bg-stripe hover:brightness-110"
            >
              {phase === "connecting" ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" aria-hidden /> Connexion sécurisée…
                </>
              ) : (
                "Connecter Stripe"
              )}
            </Button>
            <p className="flex items-center gap-2 text-sm text-slate">
              <Icon icon={Lock} anim="wiggle" className="size-4 text-emerald-ink" />
              Accès en lecture seule. Nous ne pouvons rien modifier.
            </p>
            <AnimatePresence>
              {isUnavailable && (
                <m.p
                  role="status"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-sm rounded-xl bg-gold-tint px-4 py-3 text-[13px] text-ink"
                >
                  La connexion à Stripe ouvre très bientôt. Passez cette étape : nous vous écrivons
                  dès qu&apos;elle est prête, et votre compte vous attend.
                </m.p>
              )}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setIsOtherProviderOpen((open) => !open)}
              aria-expanded={isOtherProviderOpen}
              className="min-h-11 cursor-pointer rounded-md text-[13px] text-slate underline-offset-4 hover:text-forest hover:underline"
            >
              J&apos;utilise Paddle ou Lemon Squeezy
            </button>
            <AnimatePresence>
              {isOtherProviderOpen && (
                <m.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-sm rounded-xl bg-cream px-4 py-3 text-[13px] text-ink"
                >
                  La connexion Paddle et Lemon Squeezy arrive très bientôt, en un clic elle aussi.
                  Nous vous écrivons dès qu&apos;elle est prête.
                </m.p>
              )}
            </AnimatePresence>
          </m.div>
        ) : (
          <m.div
            key="import"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.screen, ease: EASE_OUT }}
          >
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-forest">
              <Check className="size-4 text-emerald-ink" strokeWidth={3} aria-hidden /> Stripe
              connecté · import de 12 mois
            </p>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {IMPORTED.map((item, index) => (
                <m.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.12, duration: DURATION.screen, ease: EASE_OUT }}
                  className="rounded-2xl bg-cream p-4"
                  data-icon-trigger
                >
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate">
                    <Icon icon={item.icon} className="size-4" /> {item.label}
                  </p>
                  <AnimatedNumber
                    value={item.value}
                    className="font-serif text-3xl font-semibold text-forest"
                  />
                </m.div>
              ))}
            </div>

            <AnimatePresence>
              {(phase === "linking" || phase === "linked") && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-line p-5"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Icon icon={Link2} anim="tilt" className="size-4 text-emerald-ink" />
                      Liaison automatique de vos visiteurs et de vos clients
                    </p>
                    {phase === "linked" && (
                      <m.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={SPRING}
                        className="grid size-6 place-items-center rounded-full bg-emerald text-forest-deep"
                      >
                        <Check className="size-3.5" strokeWidth={3} aria-hidden />
                      </m.span>
                    )}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sand">
                    <m.span
                      className="block h-full origin-left rounded-full bg-emerald"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: COVERAGE / 100 }}
                      transition={{ duration: DURATION.data * 2, ease: EASE_OUT }}
                    />
                  </div>
                  <p className="mt-3 text-[13px] text-slate" aria-live="polite">
                    {phase === "linked"
                      ? `${COVERAGE} % de vos clients sont reliés à leur provenance.`
                      : "Nous comparons les emails chiffrés de vos inscrits et de vos clients Stripe…"}
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
