"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Mail } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { PLANS } from "@/features/marketing/content";
import { formatEuroExact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { openPortal, startCheckout } from "./actions";
import { annualTotal, MONTHLY_PRICE, isPaidPlan, type Interval } from "./plans";

/** Ouvre la page Stripe renvoyée par l'action (paiement ou portail), sinon explique pourquoi. */
export function useStripeRedirect() {
  const [isPending, startTransition] = useTransition();
  const go = (action: () => Promise<{ ok: true; url: string } | { ok: false; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) window.location.assign(result.url);
      else toast.error(result.message);
    });
  return { isPending, go };
}

/** « Gérer mon abonnement » : changer d'offre ou de carte, factures, résiliation (Stripe). */
export function PortalButton({ variant = "secondary" }: { variant?: "secondary" | "primary" }) {
  const { isPending, go } = useStripeRedirect();
  return (
    <Button variant={variant} size="sm" disabled={isPending} onClick={() => go(openPortal)}>
      Gérer mon abonnement <Icon icon={ArrowRight} anim="nudge" />
    </Button>
  );
}

/** Choix de l'offre : mensuel ou annuel (−20 %), puis la page de paiement Stripe. */
export function PlanChooser({ contactEmail }: { contactEmail?: string | null }) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const { isPending, go } = useStripeRedirect();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Rythme de paiement"
          pillId="rythme-paiement"
          options={[
            { value: "monthly", label: "Mensuel" },
            { value: "annual", label: "Annuel −20 %" },
          ]}
          value={interval}
          onChange={setInterval}
        />
        <p className="text-xs text-slate">
          Prix HT · TVA calculée selon votre pays · sans engagement
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        {PLANS.map((plan) => {
          const paid = isPaidPlan(plan.id) ? plan.id : null;
          const isRecommended = "isRecommended" in plan && plan.isRecommended;
          return (
            <Card
              key={plan.id}
              className={cn("flex flex-col", isRecommended && "border-forest ring-1 ring-forest")}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-serif text-xl font-semibold text-forest">{plan.name}</p>
                {isRecommended && <Badge tone="attention">Le plus choisi</Badge>}
              </div>
              <p className="mb-4 text-sm text-slate">{plan.pitch}</p>
              {paid ? (
                <p className="mb-1 text-ink">
                  <span className="font-serif text-3xl font-semibold text-forest">
                    {formatEuroExact(
                      interval === "annual" ? annualTotal(paid) / 12 : MONTHLY_PRICE[paid],
                    )}
                  </span>{" "}
                  <span className="text-sm text-slate">HT / mois</span>
                </p>
              ) : (
                <p className="mb-1 font-serif text-3xl font-semibold text-forest">Sur devis</p>
              )}
              <p className="mb-4 min-h-5 text-xs text-slate">
                {paid && interval === "annual"
                  ? `${formatEuroExact(annualTotal(paid))} HT facturés une fois par an`
                  : paid
                    ? "Facturé chaque mois"
                    : "Selon votre volume"}
              </p>
              <ul className="mb-5 space-y-2 text-sm text-ink">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-ink" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {paid ? (
                  <Button
                    className="w-full"
                    variant={isRecommended ? "positive" : "primary"}
                    disabled={isPending}
                    onClick={() => go(() => startCheckout(paid, interval))}
                  >
                    Choisir {plan.name} <Icon icon={ArrowRight} anim="nudge" />
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="secondary">
                    <a
                      href={`mailto:${contactEmail || "contact@saasclair.com"}?subject=Offre%20Pro`}
                    >
                      <Icon icon={Mail} anim="bounce" /> Nous contacter
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
