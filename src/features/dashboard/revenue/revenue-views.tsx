"use client";

import { useId, useState } from "react";
import { m } from "motion/react";
import { toast } from "sonner";
import { Check, PartyPopper, RefreshCw, Send } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { cascade, DURATION, EASE_OUT, fadeUp, growX, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { FailedPayment } from "../customers";
import type { Flow, MrrPoint } from "./data";

const PLOT_WIDTH = 600;
const PLOT_HEIGHT = 200;

/** Courbe du revenu mensuel récurrent, qui se trace de gauche à droite. */
export function MrrChart({ startMrr, history }: { startMrr: number; history: MrrPoint[] }) {
  const clipId = useId();
  const gradientId = useId();
  const values = [startMrr, ...history.map((point) => point.mrr)];
  const low = Math.min(...values) * 0.98;
  const high = Math.max(...values) * 1.01;
  const y = (value: number) => PLOT_HEIGHT - ((value - low) / (high - low || 1)) * PLOT_HEIGHT;
  const x = (index: number) => (index / (values.length - 1)) * PLOT_WIDTH;
  const line = values.map(
    (value, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(value).toFixed(1)}`,
  );
  const ticks = [high, (high + low) / 2, low];
  const last = values[values.length - 1];

  return (
    <Card className="flex h-full min-w-0 flex-col">
      <CardEyebrow>Revenu mensuel récurrent</CardEyebrow>
      <p className="mb-1 font-serif text-xl font-semibold text-forest">
        De {formatEuro(startMrr)} à {formatEuro(last)}.
      </p>
      <p className="mb-5 text-[13px] text-slate">Valeur en fin de chaque tranche de la période.</p>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <div className="flex flex-col justify-between py-0 text-[11px] text-slate tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatEuro(Math.round(tick / 100) * 100)}
            </span>
          ))}
        </div>
        <div className="relative h-52">
          {[0, 50, 100].map((top) => (
            <span
              key={top}
              aria-hidden
              className="absolute inset-x-0 h-px bg-line"
              style={{ top: `${top}%` }}
            />
          ))}
          <m.svg
            viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            role="img"
            aria-label={`Revenu mensuel récurrent : de ${formatEuro(startMrr)} à ${formatEuro(last)}`}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--emerald)" stopOpacity="0.25" />
                <stop offset="1" stopColor="var(--emerald)" stopOpacity="0" />
              </linearGradient>
              <clipPath id={clipId}>
                <m.rect
                  x={-4}
                  y={-10}
                  width={PLOT_WIDTH + 8}
                  height={PLOT_HEIGHT + 20}
                  style={{ originX: 0 }}
                  variants={{
                    hidden: { scaleX: 0 },
                    show: {
                      scaleX: 1,
                      transition: { duration: DURATION.data * 1.4, ease: EASE_OUT },
                    },
                  }}
                />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <path
                d={`${line.join(" ")} L${PLOT_WIDTH} ${PLOT_HEIGHT} L0 ${PLOT_HEIGHT} Z`}
                fill={`url(#${gradientId})`}
              />
              <path
                d={line.join(" ")}
                fill="none"
                stroke="var(--emerald)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </m.svg>
          <m.span
            aria-hidden
            className="pulse-ring absolute right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald text-emerald"
            style={{ top: `${(y(last) / PLOT_HEIGHT) * 100}%` }}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: DURATION.data * 1.3, duration: DURATION.micro }}
          />
        </div>
        <span />
        <div className="flex justify-between text-[11px] text-slate">
          {history
            // Au-delà de 7 repères, un sur deux (le dernier toujours affiché).
            .filter((_, index) => history.length <= 7 || index % 2 === (history.length - 1) % 2)
            .map((point, index) => (
              <span key={point.label + index}>{point.label}</span>
            ))}
        </div>
      </div>
    </Card>
  );
}

/** Ce qui a fait bouger le revenu : gains vers la droite (émeraude), pertes vers la gauche (or). */
export function RevenueFlows({ flows, startMrr }: { flows: Flow[]; startMrr: number }) {
  const top = Math.max(...flows.map((flow) => Math.abs(flow.amount))) || 1;
  const net = flows.reduce((sum, flow) => sum + flow.amount, 0);
  return (
    <Card className="flex h-full flex-col">
      <CardEyebrow>Mouvements du revenu</CardEyebrow>
      <p className="mb-6 font-serif text-xl font-semibold text-forest">
        Ce qui a fait bouger votre revenu.
      </p>
      <m.ul className="space-y-5" initial="hidden" whileInView="show" viewport={{ once: true }}>
        {flows.map((flow, index) => {
          const isGain = flow.amount >= 0;
          const width = `${(Math.abs(flow.amount) / top) * 100}%`;
          return (
            <li key={flow.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span>
                  <span className="font-semibold text-ink">{flow.label}</span>
                  <span className="ml-2 text-xs text-slate">{flow.detail}</span>
                </span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    isGain ? "text-emerald-ink" : "text-gold-ink",
                  )}
                >
                  {isGain ? "+" : "−"}
                  {formatEuro(Math.abs(flow.amount))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px" aria-hidden>
                <div className="flex h-2.5 justify-end overflow-hidden rounded-l-full bg-sand">
                  {!isGain && (
                    <m.span
                      variants={growX}
                      custom={index * STAGGER}
                      className="block h-full origin-right rounded-l-full bg-gold"
                      style={{ width }}
                    />
                  )}
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-r-full bg-sand">
                  {isGain && (
                    <m.span
                      variants={growX}
                      custom={index * STAGGER}
                      className={cn(
                        "block h-full origin-left rounded-r-full",
                        flow.id === "new" ? "bg-emerald" : "bg-forest",
                      )}
                      style={{ width }}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </m.ul>
      <p className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-4 text-sm">
        <span className="text-slate">
          {formatEuro(startMrr)} → {formatEuro(startMrr + net)}
        </span>
        <span className="font-semibold text-forest">
          Solde : {net >= 0 ? "+" : "−"}
          {formatEuro(Math.abs(net))} par mois
        </span>
      </p>
    </Card>
  );
}

/** Paiements échoués : relance en un clic, l'état change tout de suite. */
export function FailedPayments({
  payments,
  recovered,
}: {
  payments: FailedPayment[];
  recovered: number;
}) {
  const [reminded, setReminded] = useState<string[]>([]);
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const send = (payment: FailedPayment) => {
    setReminded((current) => [...current, payment.id]);
    // Données de démonstration : rien n'est envoyé au client.
    toast.success(`Relance prête pour ${payment.customer}.`, {
      description: "En démonstration, aucun email n'est envoyé.",
    });
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-6 pb-4">
        <div>
          <CardEyebrow>Paiements échoués</CardEyebrow>
          <p className="font-serif text-xl font-semibold text-forest">
            {payments.length
              ? `${formatEuro(total)} à récupérer, sans effort.`
              : "Aucun paiement à récupérer."}
          </p>
        </div>
        <Badge tone="growth">
          <Icon icon={RefreshCw} anim="spin" className="size-3.5" />
          {formatEuro(recovered)} récupérés automatiquement
        </Badge>
      </div>
      {payments.length === 0 ? (
        <StateMessage
          icon={PartyPopper}
          anim="tilt"
          title="Tous vos paiements sont passés."
          description="Nous relançons automatiquement les cartes refusées. Vous n'avez rien à faire."
        />
      ) : (
        <m.ul
          className="divide-y divide-line border-t border-line"
          variants={cascade}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {payments.map((payment) => {
            const isReminded = reminded.includes(payment.id);
            return (
              <m.li
                key={payment.id}
                variants={fadeUp}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-4"
              >
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold text-ink">{payment.customer}</p>
                  <p className="text-[13px] text-slate">
                    {payment.reason} · {payment.attempts}{" "}
                    {payment.attempts > 1 ? "tentatives" : "tentative"} · nouvel essai dans{" "}
                    {payment.nextRetryInDays} {payment.nextRetryInDays > 1 ? "jours" : "jour"}
                  </p>
                </div>
                <span className="font-semibold text-forest tabular-nums">
                  {formatEuro(payment.amount)}
                </span>
                <Button
                  size="sm"
                  variant={isReminded ? "ghost" : "secondary"}
                  disabled={isReminded}
                  onClick={() => send(payment)}
                  className="w-full sm:w-auto"
                >
                  <Icon icon={isReminded ? Check : Send} anim={isReminded ? "pop" : "nudge"} />
                  {isReminded ? "Relance prête" : "Relancer"}
                </Button>
              </m.li>
            );
          })}
        </m.ul>
      )}
    </Card>
  );
}
