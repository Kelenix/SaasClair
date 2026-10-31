"use client";

import Link from "next/link";
import { m } from "motion/react";
import { ArrowRight, Inbox } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { RiskMeter } from "@/components/data/risk-meter";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { GrowBar } from "@/components/data/grow-bar";
import { formatEuro, formatNumber, formatPercent } from "@/lib/format";
import { growY, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  weakestFunnelStep,
  type AtRiskCustomer,
  type Channel,
  type FunnelStep,
} from "../demo-data";

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start rounded-md pt-3 text-sm font-semibold text-forest underline-offset-4 hover:underline"
    >
      {label} <Icon icon={ArrowRight} anim="nudge" className="size-4" />
    </Link>
  );
}

/** Canaux d'acquisition classés par revenu apporté. */
export function ChannelsCard({ channels }: { channels: Channel[] }) {
  const top = Math.max(...channels.map((channel) => channel.revenue));
  return (
    <Card className="flex h-full flex-col">
      <CardEyebrow>Canaux d&apos;acquisition</CardEyebrow>
      <p className="mb-5 font-serif text-xl font-semibold text-forest">
        Classés par revenu apporté.
      </p>
      <ol className="space-y-4">
        {channels.map((channel, index) => (
          <li key={channel.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">
                <span className="mr-2 text-slate tabular-nums">{index + 1}.</span>
                {channel.name}
              </span>
              <span className="font-semibold text-forest tabular-nums">
                {formatEuro(channel.revenue)}
              </span>
            </div>
            <GrowBar
              share={(channel.revenue / top) * 100}
              delay={index * STAGGER}
              tone={index === channels.length - 1 ? "gold" : "emerald"}
            />
            <p className="mt-1 text-xs text-slate">
              {formatNumber(channel.visitors)} visiteurs · {channel.customers} nouveaux clients
            </p>
          </li>
        ))}
      </ol>
      <SeeAll href="/app/acquisition" label="Détail par canal" />
    </Card>
  );
}

/** Aperçu du tunnel : l'étape la plus sous son taux habituel est mise en évidence en or. */
export function FunnelPreview({ funnel }: { funnel: FunnelStep[] }) {
  const weakest = weakestFunnelStep(funnel);
  const max = funnel[0].count;
  const weakestRate = weakest > 0 ? funnel[weakest].count / funnel[weakest - 1].count : 0;

  return (
    <Card className="flex h-full min-w-0 flex-col">
      <CardEyebrow>Tunnel de conversion</CardEyebrow>
      <p className="mb-5 font-serif text-xl font-semibold text-forest">
        Où vos visiteurs s&apos;arrêtent.
      </p>
      <m.ol
        className="mb-4 grid grid-cols-5 items-end gap-2"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {funnel.map((step, index) => {
          const isWeakest = index === weakest;
          return (
            <li key={step.id} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
              <span className="text-[13px] font-semibold text-forest tabular-nums">
                {formatNumber(step.count)}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <m.span
                  variants={growY}
                  custom={index * STAGGER}
                  className={cn(
                    "block w-full max-w-12 origin-bottom rounded-t-lg",
                    isWeakest ? "bg-gold" : "bg-emerald",
                  )}
                  style={{ height: `${Math.max(6, Math.sqrt(step.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-full truncate text-[11px] text-slate">{step.label}</span>
              {index > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    isWeakest ? "pulse-soft bg-gold-tint text-gold-ink" : "bg-sand text-slate",
                  )}
                >
                  −{Math.round((1 - step.count / funnel[index - 1].count) * 100)} %
                </span>
              )}
            </li>
          );
        })}
      </m.ol>
      {weakest > 0 && (
        <p className="rounded-xl border-l-4 border-gold bg-cream px-3.5 py-2.5 text-[13px] text-ink">
          <strong className="text-forest">{funnel[weakest].label} :</strong>{" "}
          {formatPercent(weakestRate * 100, 0)} des {funnel[weakest - 1].label.toLowerCase()}s
          passent l&apos;étape, contre {formatPercent(funnel[weakest].benchmark * 100, 0)}{" "}
          d&apos;habitude. Cause probable : la page de paiement sur mobile.
        </p>
      )}
      <SeeAll href="/app/tunnel" label="Voir le tunnel complet" />
    </Card>
  );
}

/** Liste courte des clients à risque, avec la jauge animée et la raison principale. */
export function AtRiskCard({ customers }: { customers: AtRiskCustomer[] }) {
  const total = customers.reduce((sum, customer) => sum + customer.mrr, 0);
  const nextRenewal = Math.min(...customers.map((customer) => customer.renewsInDays));

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <CardEyebrow>Clients à risque</CardEyebrow>
          <p className="font-serif text-xl font-semibold text-forest">
            {customers.length
              ? `${customers.length} clients risquent de partir.`
              : "Aucun client à risque."}
          </p>
        </div>
        {customers.length > 0 && (
          <Badge tone="attention" pulse>
            {formatEuro(total)} / mois
          </Badge>
        )}
      </div>
      {customers.length === 0 ? (
        <StateMessage
          icon={Inbox}
          title="Tout va bien."
          description="Nous vous prévenons dès qu'un client montre des signes de départ."
          className="py-6"
        />
      ) : (
        <>
          <ul>
            {customers.map((customer) => (
              <li key={customer.id} className="border-t border-line">
                <Link
                  href={`/app/churn?client=${customer.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors duration-200 outline-none hover:bg-cream focus-visible:outline-2 focus-visible:outline-emerald-ink"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream text-xs font-bold text-forest">
                      {customer.initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{customer.name}</span>
                      <span className="block truncate text-xs text-slate">
                        {customer.reasons[0]}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatEuro(customer.mrr)}
                    </span>
                    <RiskMeter score={customer.score} className="w-16 sm:w-20" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-slate">
            Premier renouvellement dans {nextRenewal} jours : vous avez le temps d&apos;agir.
          </p>
        </>
      )}
      <SeeAll href="/app/churn" label="Voir tous les clients à risque" />
    </Card>
  );
}
