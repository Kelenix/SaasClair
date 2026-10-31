"use client";

import { toast } from "sonner";
import { Check, Gift, Receipt } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { PLANS } from "@/features/marketing/content";
import { formatEuro, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// Démonstration : usage du mois en cours pour le SaaS de Nadia.
const VISITS_THIS_MONTH = 132_400;
const VISITS_INCLUDED = 200_000;

/** Abonnement et facturation : l'essai, l'usage, les offres et les factures. */
export function BillingPanel({
  trialDaysLeft,
  members,
}: {
  trialDaysLeft: number;
  members: number;
}) {
  const choose = (name: string) =>
    toast.success(`Offre ${name} notée.`, {
      description:
        "Le paiement en ligne arrive bientôt. Votre essai continue sans interruption d'ici là.",
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <CardEyebrow>Votre abonnement</CardEyebrow>
              <p className="font-serif text-xl font-semibold text-forest">
                Essai gratuit de l&apos;offre Growth
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-tint text-gold-ink">
              <Icon icon={Gift} anim="bounce" />
            </span>
          </div>
          <p className="mb-2 text-[15px] text-ink">
            {trialDaysLeft > 0
              ? `Il vous reste ${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""} d'essai. Aucun prélèvement avant la fin.`
              : "Votre essai est terminé. Choisissez une offre pour garder vos données à jour."}
          </p>
          <GrowBar share={(Math.max(0, 14 - trialDaysLeft) / 14) * 100} tone="gold" />
          <p className="mt-1.5 text-xs text-slate">14 jours d&apos;essai au total</p>
        </Card>

        <Card>
          <CardEyebrow>Usage ce mois-ci</CardEyebrow>
          <p className="mb-5 font-serif text-xl font-semibold text-forest">
            Vous êtes large dans votre offre.
          </p>
          <div className="mb-4">
            <p className="mb-1.5 flex justify-between gap-3 text-sm">
              <span className="text-ink">Visites suivies</span>
              <span className="font-semibold text-forest tabular-nums">
                {formatNumber(VISITS_THIS_MONTH)} / {formatNumber(VISITS_INCLUDED)}
              </span>
            </p>
            <GrowBar share={(VISITS_THIS_MONTH / VISITS_INCLUDED) * 100} />
          </div>
          <div>
            <p className="mb-1.5 flex justify-between gap-3 text-sm">
              <span className="text-ink">Membres de l&apos;équipe</span>
              <span className="font-semibold text-forest tabular-nums">{members} / 5</span>
            </p>
            <GrowBar share={(members / 5) * 100} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === "growth";
          return (
            <Card
              key={plan.id}
              interactive
              className={cn("flex flex-col", isCurrent && "border-forest/40")}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-serif text-xl font-semibold text-forest">{plan.name}</p>
                {isCurrent && <Badge tone="brand">En essai</Badge>}
              </div>
              <p className="mb-3 text-sm text-slate">{plan.pitch}</p>
              <p className="mb-4 font-serif text-3xl font-semibold text-forest">
                {plan.monthly ? (
                  <>
                    {formatEuro(plan.monthly)}
                    <span className="font-sans text-sm font-normal text-slate"> / mois</span>
                  </>
                ) : (
                  "Sur devis"
                )}
              </p>
              <ul className="mb-5 space-y-1.5 text-sm text-ink">
                {plan.features.slice(0, 3).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Icon icon={Check} className="mt-0.5 size-4 shrink-0 text-emerald-ink" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "primary" : "secondary"}
                size="sm"
                className="mt-auto"
                onClick={() => choose(plan.name)}
              >
                {plan.monthly
                  ? isCurrent
                    ? "Garder Growth"
                    : `Choisir ${plan.name}`
                  : "Nous contacter"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardEyebrow>Factures</CardEyebrow>
        <StateMessage
          icon={Receipt}
          anim="tilt"
          title="Pas encore de facture."
          description="Votre première facture arrivera à la fin de l'essai, avec un rappel 3 jours avant."
          className="py-6"
        />
      </Card>
    </div>
  );
}
