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
import type { StripeResult } from "@/features/stripe/oauth-state";
import { connectStripe } from "./actions";

type Phase = "idle" | "connecting" | "importing" | "linking" | "linked";

type Counts = { customers: number; invoices: number; subscriptions: number };

const IMPORTED: { icon: LucideIcon; label: string; key: keyof Counts }[] = [
  { icon: Users, label: "Clients", key: "customers" },
  { icon: Receipt, label: "Factures", key: "invoices" },
  { icon: CreditCard, label: "Abonnements", key: "subscriptions" },
];
// Démonstration : import du compte Stripe de Nadia (≈ 340 clients, 12 mois d'historique).
const DEMO_COUNTS: Counts = { customers: 340, invoices: 3912, subscriptions: 352 };
const STATUS_POLL_MS = 2000;

/** Message au retour de Stripe (paramètre ?stripe=), ou quand la connexion n'est pas ouverte. */
const NOTICES: Record<Exclude<StripeResult, "ok">, string> = {
  refuse: "Connexion annulée : rien n'a été partagé. Vous pouvez réessayer quand vous voulez.",
  erreur: "La connexion n'a pas abouti. Réessayez dans un instant.",
  indisponible:
    "La connexion à Stripe ouvre très bientôt. Passez cette étape : nous vous écrivons dès qu'elle est prête, et votre compte vous attend.",
  "deja-relie": "Ce compte Stripe est déjà relié à un autre compte SaasClair.",
};
const COVERAGE = 91;
const PHASE_DURATION_MS: Partial<Record<Phase, number>> = {
  importing: 2400,
  linking: 2200,
  linked: 1800,
};
const NEXT_PHASE: Partial<Record<Phase, Phase>> = { importing: "linking", linking: "linked" };

type StepStripeProps = {
  /** Stripe configuré sur le serveur : vraie connexion (sinon simulation, en local seulement). */
  available: boolean;
  demo: boolean;
  /** Retour de la page d'autorisation de Stripe (null : première visite de l'étape). */
  result: StripeResult | null;
  onDone: () => void;
};

export function StepStripe({ available, demo, result, onDone }: StepStripeProps) {
  const real = available;
  // Retour de Stripe réussi : l'import réel a commencé côté serveur, on suit son avancement.
  const [phase, setPhase] = useState<Phase>(real && result === "ok" ? "importing" : "idle");
  const [counts, setCounts] = useState<Counts>(
    real ? { customers: 0, invoices: 0, subscriptions: 0 } : DEMO_COUNTS,
  );
  const [notice, setNotice] = useState<string | null>(
    result && result !== "ok" ? NOTICES[result] : null,
  );
  const [isOtherProviderOpen, setIsOtherProviderOpen] = useState(false);
  const finish = useEffectEvent(onDone);

  // Import réel : les nombres arrivent au fil de l'import, jusqu'à « terminé » (ou l'échec).
  useEffect(() => {
    if (!real || phase !== "importing") return;
    const timer = setInterval(async () => {
      const response = await fetch("/api/stripe/status", { cache: "no-store" }).catch(() => null);
      const status = (await response?.json().catch(() => null)) as
        (Counts & { status: string | null }) | null;
      if (!status) return;
      setCounts({
        customers: status.customers,
        invoices: status.invoices,
        subscriptions: status.subscriptions,
      });
      if (status.status === "done") setPhase("linked");
      if (status.status === "error") {
        setNotice("L'import de vos données Stripe a échoué. Réessayez : rien n'a été modifié.");
        setPhase("idle");
      }
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [real, phase]);

  useEffect(() => {
    // Import réel : il dure le temps qu'il faut, pas de minuterie.
    if (real && phase === "importing") return;
    const duration = PHASE_DURATION_MS[phase];
    if (!duration) return;
    const timer = setTimeout(() => {
      const next = NEXT_PHASE[phase];
      if (next) setPhase(next);
      else finish();
    }, duration);
    return () => clearTimeout(timer);
  }, [real, phase]);

  async function connect() {
    if (!real && !demo) {
      setNotice(NOTICES.indisponible);
      return;
    }
    setPhase("connecting");
    if (real) {
      // Page d'autorisation de Stripe (lecture seule), puis retour ici.
      window.location.assign(new URL("/api/stripe/connect", window.location.origin).href);
      return;
    }
    // Poste de développement sans Stripe configuré : connexion et import simulés.
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
              {notice && (
                <m.p
                  role="status"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-sm rounded-xl bg-gold-tint px-4 py-3 text-[13px] text-ink"
                >
                  {notice}
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
                    value={counts[item.key]}
                    className="font-serif text-3xl font-semibold text-forest"
                  />
                </m.div>
              ))}
            </div>

            {real && phase === "linked" && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm font-semibold text-forest"
              >
                <Check className="size-4 text-emerald-ink" strokeWidth={3} aria-hidden /> Import
                terminé : vos revenus et vos clients arrivent sur votre tableau de bord.
              </p>
            )}
            <AnimatePresence>
              {!real && (phase === "linking" || phase === "linked") && (
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
