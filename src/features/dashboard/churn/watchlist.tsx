"use client";

import { useState } from "react";
import { m } from "motion/react";
import { ChevronRight, PartyPopper } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { RiskMeter } from "@/components/data/risk-meter";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEuro } from "@/lib/format";
import { cascade, fadeUp } from "@/lib/motion";
import { CustomerSheet } from "./customer-sheet";
import type { WatchedRow } from "./data";

const FILTERS = [
  { id: "high", label: "Risque élevé", match: (customer: WatchedRow) => customer.isHighRisk },
  { id: "watch", label: "Premiers signes", match: (customer: WatchedRow) => !customer.isHighRisk },
  { id: "all", label: "Tous", match: () => true },
] as const;

function RiskBadge({ customer }: { customer: WatchedRow }) {
  return customer.isHighRisk ? (
    <Badge tone="attention" pulse>
      Risque élevé
    </Badge>
  ) : (
    <Badge>Premiers signes</Badge>
  );
}

function Avatar({ customer }: { customer: WatchedRow }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-xs font-bold text-forest">
      {customer.initials}
    </span>
  );
}

/** Tableau sur grand écran : une ligne par client, cliquable pour ouvrir son panneau. */
function WatchTable({ rows, onOpen }: { rows: WatchedRow[]; onOpen: (id: string) => void }) {
  return (
    <table className="hidden w-full text-left text-sm @3xl:table">
      <thead className="border-y border-line bg-cream/60 text-xs text-slate">
        <tr>
          <th scope="col" className="py-3 pl-6 font-semibold">
            Client
          </th>
          <th scope="col" className="py-3 font-semibold">
            Revenu mensuel
          </th>
          <th scope="col" className="py-3 font-semibold">
            Risque
          </th>
          <th scope="col" className="py-3 font-semibold">
            Principales raisons
          </th>
          <th scope="col" className="py-3 font-semibold">
            Renouvellement
          </th>
          <th scope="col" className="py-3 pr-6 font-semibold">
            Action suggérée
          </th>
        </tr>
      </thead>
      <m.tbody variants={cascade} initial="hidden" animate="show">
        {rows.map((customer) => (
          <m.tr
            key={customer.id}
            variants={fadeUp}
            onClick={() => onOpen(customer.id)}
            className="cursor-pointer border-b border-line transition-colors duration-200 last:border-0 hover:bg-cream/70"
          >
            <td className="py-3.5 pl-6">
              <span className="flex items-center gap-3">
                <Avatar customer={customer} />
                <span className="min-w-0">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(customer.id);
                    }}
                    className="rounded-md text-left font-semibold text-ink underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink"
                  >
                    {customer.name}
                  </button>
                  <span className="mt-1 block">
                    <RiskBadge customer={customer} />
                  </span>
                </span>
              </span>
            </td>
            <td className="py-3.5 font-semibold text-forest tabular-nums">
              {formatEuro(customer.mrr)}
            </td>
            <td className="py-3.5">
              <span className="flex items-center gap-2">
                <RiskMeter score={customer.score} className="w-16" />
                <span className="text-xs text-slate tabular-nums">{customer.score}</span>
              </span>
            </td>
            <td className="max-w-64 py-3.5 pr-4 text-[13px] text-ink">
              {customer.reasons.map((reason) => (
                <span key={reason} className="block">
                  {reason}
                </span>
              ))}
            </td>
            <td className="py-3.5 pr-4 whitespace-nowrap">
              <span className="block text-ink">{customer.renewalDate}</span>
              <span className="block text-xs text-slate">dans {customer.renewsInDays} jours</span>
            </td>
            <td className="py-3.5 pr-6">
              <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-forest">
                {customer.action}
                <Icon icon={ChevronRight} anim="nudge" className="size-4 shrink-0 text-slate" />
              </span>
            </td>
          </m.tr>
        ))}
      </m.tbody>
    </table>
  );
}

/** Sur mobile et tablette : une carte par client. */
function WatchCards({ rows, onOpen }: { rows: WatchedRow[]; onOpen: (id: string) => void }) {
  return (
    <m.ul
      className="space-y-3 px-4 pb-4 @3xl:hidden"
      variants={cascade}
      initial="hidden"
      animate="show"
    >
      {rows.map((customer) => (
        <m.li key={customer.id} variants={fadeUp}>
          <button
            type="button"
            onClick={() => onOpen(customer.id)}
            className="w-full rounded-2xl border border-line bg-white p-4 text-left transition-[translate,box-shadow] duration-200 outline-none hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink active:scale-[0.99]"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar customer={customer} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{customer.name}</span>
                  <span className="block text-xs text-slate">
                    Renouvelle le {customer.renewalDate}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-right font-semibold text-forest tabular-nums">
                {formatEuro(customer.mrr)}
              </span>
            </span>
            <span className="mt-3 flex items-center gap-2">
              <RiskMeter score={customer.score} className="flex-1" />
              <RiskBadge customer={customer} />
            </span>
            <span className="mt-3 block text-[13px] text-ink">{customer.reasons[0]}</span>
            <span className="mt-2 flex items-center justify-between gap-2 text-[13px] font-semibold text-forest">
              {customer.action}
              <Icon icon={ChevronRight} anim="nudge" className="size-4 text-slate" />
            </span>
          </button>
        </m.li>
      ))}
    </m.ul>
  );
}

/** Liste des clients à surveiller : filtre, tableau ou cartes, et panneau détaillé au clic. */
export function Watchlist({
  customers,
  sender,
  initialOpenId,
}: {
  customers: WatchedRow[];
  sender: string;
  initialOpenId?: string;
}) {
  const [selectedId, setSelectedId] = useState(
    customers.some((customer) => customer.id === initialOpenId) ? initialOpenId : undefined,
  );
  const [isOpen, setIsOpen] = useState(selectedId !== undefined);
  const selected = customers.find((customer) => customer.id === selectedId);
  const open = (id: string) => {
    setSelectedId(id);
    setIsOpen(true);
  };
  const highRiskRevenue = customers
    .filter((customer) => customer.isHighRisk)
    .reduce((sum, customer) => sum + customer.mrr, 0);

  return (
    <Card className="overflow-hidden p-0">
      <Tabs defaultValue="high" className="gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
          <div>
            <CardEyebrow>Clients à surveiller</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              {formatEuro(highRiskRevenue)} de revenu mensuel à protéger.
            </p>
          </div>
          <TabsList aria-label="Filtrer les clients">
            {FILTERS.map((filter) => (
              <TabsTrigger key={filter.id} value={filter.id}>
                {filter.label}
                <span className="rounded-full bg-cream px-1.5 text-xs tabular-nums">
                  {customers.filter(filter.match).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {FILTERS.map((filter) => {
          const rows = customers.filter(filter.match);
          return (
            <TabsContent key={filter.id} value={filter.id}>
              {rows.length === 0 ? (
                <StateMessage
                  icon={PartyPopper}
                  anim="tilt"
                  title="Personne dans cette liste."
                  description="Vos clients vont bien. Nous vous prévenons dès que l'un d'eux montre un signe de départ."
                />
              ) : (
                <>
                  <WatchTable rows={rows} onOpen={open} />
                  <WatchCards rows={rows} onOpen={open} />
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      <CustomerSheet customer={selected} open={isOpen} onOpenChange={setIsOpen} sender={sender} />
    </Card>
  );
}
