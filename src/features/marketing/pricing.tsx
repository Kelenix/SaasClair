"use client";

import Link from "next/link";
import { useState } from "react";
import { m } from "motion/react";
import { Check } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { Cascade, CascadeItem, Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PLANS } from "./content";
import { annualMonthlyPrice } from "./pricing-math";

type Billing = "monthly" | "annual";

const BILLING_OPTIONS: { id: Billing; label: string }[] = [
  { id: "monthly", label: "Mensuel" },
  { id: "annual", label: "Annuel" },
];

/** `contactEmail` : réglé dans l'espace administrateur ; sans lui, l'offre Pro renvoie à l'essai. */
export function Pricing({ contactEmail }: { contactEmail: string | null }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const isAnnual = billing === "annual";

  return (
    <section id="tarifs" className="scroll-mt-20 border-t border-line bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-10">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center">
          <p className="eyebrow">Tarifs</p>
          <h2 className="mb-4 text-[32px] sm:text-[40px]">
            Un prix simple. 14 jours pour essayer.
          </h2>
          <p className="text-[17px] text-slate">
            Le même essai gratuit sur chaque offre. SaasClair ne fait que lire votre Stripe.
          </p>
        </Reveal>

        <div className="mb-8 flex justify-center">
          <div
            role="group"
            aria-label="Facturation"
            className="relative inline-flex rounded-full bg-sand p-1"
          >
            {BILLING_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={billing === id}
                onClick={() => setBilling(id)}
                className="relative h-11 cursor-pointer rounded-full px-6 text-sm font-semibold text-slate transition-colors aria-pressed:text-forest"
              >
                {billing === id && (
                  <m.span
                    layoutId="billing-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-full bg-white shadow-card"
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {label}
                  {id === "annual" && (
                    <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[11px] text-gold-ink">
                      −20 %
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Cascade className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isRecommended = "isRecommended" in plan && plan.isRecommended;
            const price =
              plan.monthly && (isAnnual ? annualMonthlyPrice(plan.monthly) : plan.monthly);
            return (
              <CascadeItem key={plan.id} className="h-full">
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-card border p-7 transition-[translate,box-shadow] duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0",
                    isRecommended
                      ? "border-forest bg-forest text-cream shadow-float"
                      : "border-line bg-cream shadow-card hover:shadow-lift",
                  )}
                >
                  {isRecommended && (
                    <Badge
                      tone="attention"
                      className="absolute -top-3 left-7 bg-gold text-forest-deep"
                    >
                      Le plus choisi
                    </Badge>
                  )}
                  <h3 className={cn("text-2xl", isRecommended && "text-cream")}>{plan.name}</h3>
                  <p
                    className={cn(
                      "mb-6 text-[15px]",
                      isRecommended ? "text-cream/75" : "text-slate",
                    )}
                  >
                    {plan.pitch}
                  </p>

                  <div className="mb-1 flex items-baseline gap-1.5">
                    {price ? (
                      <>
                        <AnimatedNumber
                          value={price}
                          format="euro"
                          className={cn(
                            "font-serif text-5xl font-semibold",
                            isRecommended ? "text-cream" : "text-forest",
                          )}
                        />
                        <span className={isRecommended ? "text-cream/70" : "text-slate"}>
                          / mois
                        </span>
                      </>
                    ) : (
                      <span
                        className={cn(
                          "font-serif text-5xl font-semibold",
                          isRecommended ? "text-cream" : "text-forest",
                        )}
                      >
                        Sur devis
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "mb-7 min-h-5 text-[13px]",
                      isRecommended ? "text-cream/70" : "text-slate",
                    )}
                  >
                    {price && isAnnual
                      ? `Soit ${formatEuro(price * 12)} facturés une fois par an`
                      : price
                        ? "Facturé chaque mois"
                        : "Selon votre volume"}
                  </p>

                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[15px]">
                        <span
                          className={cn(
                            "mt-0.5",
                            isRecommended ? "text-emerald" : "text-emerald-ink",
                          )}
                        >
                          <Icon icon={Check} className="size-4.5" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={isRecommended ? "positive" : "secondary"}
                    className="mt-auto w-full"
                  >
                    <Link
                      href={
                        plan.monthly
                          ? `/inscription?offre=${plan.id}`
                          : contactEmail
                            ? `mailto:${contactEmail}?subject=${encodeURIComponent("Offre Pro SaasClair")}`
                            : "/inscription?offre=pro"
                      }
                    >
                      {plan.monthly ? "Commencer l'essai gratuit" : "Nous contacter"}
                    </Link>
                  </Button>
                </div>
              </CascadeItem>
            );
          })}
        </Cascade>
      </div>
    </section>
  );
}
