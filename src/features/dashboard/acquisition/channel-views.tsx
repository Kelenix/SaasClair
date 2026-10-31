"use client";

import { m } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEuro, formatNumber, formatPercent } from "@/lib/format";
import { cascade, fadeUp, growX, growY, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ChannelRow, ChannelSlot, SourceRow } from "./data";

/** Une couleur par canal, du plus rentable (forêt) au moins rentable (or). */
const CHANNEL_COLORS: Record<string, string> = {
  seo: "bg-forest",
  linkedin: "bg-emerald",
  direct: "bg-forest/55",
  partners: "bg-emerald/45",
  instagram: "bg-gold",
};
const colorOf = (id: string) => CHANNEL_COLORS[id] ?? "bg-slate/40";

const rate = (part: number, whole: number) => formatPercent(whole ? (part / whole) * 100 : 0);

function Legend({ channels }: { channels: { id: string; name: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-slate">
      {channels.map((channel) => (
        <li key={channel.id} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", colorOf(channel.id))} aria-hidden />
          {channel.name}
        </li>
      ))}
    </ul>
  );
}

function ChurnBadge({ churn }: { churn: number }) {
  return (
    <Badge tone={churn <= 5 ? "growth" : churn >= 9 ? "attention" : "neutral"}>
      {churn} % de churn
    </Badge>
  );
}

/** Tableau par canal : visiteurs → inscrits → clients payants → revenu, avec barres animées. */
export function ChannelTable({ channels }: { channels: ChannelRow[] }) {
  const top = Math.max(...channels.map((channel) => channel.revenue));
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-6 pt-6 pb-5">
        <CardEyebrow>Canaux d&apos;acquisition</CardEyebrow>
        <p className="font-serif text-xl font-semibold text-forest">
          Classés par revenu mensuel apporté.
        </p>
      </div>

      <table className="hidden w-full text-left text-sm @3xl:table">
        <thead className="border-y border-line bg-cream/60 text-xs text-slate">
          <tr>
            <th scope="col" className="py-3 pl-6 font-semibold">
              Canal
            </th>
            <th scope="col" className="py-3 text-right font-semibold">
              Visiteurs
            </th>
            <th scope="col" className="py-3 text-right font-semibold">
              Inscrits
            </th>
            <th scope="col" className="py-3 text-right font-semibold">
              Clients payants
            </th>
            <th scope="col" className="w-[30%] py-3 pl-8 font-semibold">
              Revenu mensuel
            </th>
            <th scope="col" className="py-3 pr-6 font-semibold">
              Fidélité
            </th>
          </tr>
        </thead>
        <m.tbody variants={cascade} initial="hidden" whileInView="show" viewport={{ once: true }}>
          {channels.map((channel, index) => (
            <m.tr
              key={channel.id}
              variants={fadeUp}
              className="border-b border-line transition-colors duration-200 last:border-0 hover:bg-cream/60"
            >
              <th scope="row" className="py-4 pl-6 font-semibold text-ink">
                <span className="flex items-center gap-2.5">
                  <span className={cn("size-2.5 rounded-sm", colorOf(channel.id))} aria-hidden />
                  {channel.name}
                </span>
              </th>
              <td className="py-4 text-right tabular-nums">{formatNumber(channel.visitors)}</td>
              <td className="py-4 text-right tabular-nums">
                {formatNumber(channel.signups)}
                <span className="block text-xs text-slate">
                  {rate(channel.signups, channel.visitors)}
                </span>
              </td>
              <td className="py-4 text-right tabular-nums">
                {formatNumber(channel.customers)}
                <span className="block text-xs text-slate">
                  {rate(channel.customers, channel.signups)}
                </span>
              </td>
              <td className="py-4 pl-8">
                <span className="mb-1.5 block font-semibold text-forest tabular-nums">
                  {formatEuro(channel.revenue)}
                </span>
                <GrowBar
                  share={(channel.revenue / top) * 100}
                  delay={index * STAGGER}
                  tone={index === channels.length - 1 ? "gold" : "emerald"}
                />
              </td>
              <td className="py-4 pr-6">
                <ChurnBadge churn={channel.churn} />
              </td>
            </m.tr>
          ))}
        </m.tbody>
      </table>

      <m.ul
        className="space-y-3 px-4 pb-4 @3xl:hidden"
        variants={cascade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {channels.map((channel, index) => (
          <m.li
            key={channel.id}
            variants={fadeUp}
            className="rounded-2xl border border-line bg-white p-4"
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <span className={cn("size-2.5 rounded-sm", colorOf(channel.id))} aria-hidden />
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
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-slate tabular-nums">
              {formatNumber(channel.visitors)} visiteurs
              <Icon icon={ArrowRight} anim="nudge" className="size-3" />
              {formatNumber(channel.signups)} inscrits
              <Icon icon={ArrowRight} anim="nudge" className="size-3" />
              <strong className="text-ink">{formatNumber(channel.customers)} clients</strong>
            </p>
            <div className="mt-3">
              <ChurnBadge churn={channel.churn} />
            </div>
          </m.li>
        ))}
      </m.ul>
    </Card>
  );
}

/** Répartition du revenu : une barre à 100 % dont chaque part pousse à son tour. */
export function ChannelShare({ channels }: { channels: ChannelRow[] }) {
  const total = channels.reduce((sum, channel) => sum + channel.revenue, 0) || 1;
  return (
    <Card className="flex h-full flex-col">
      <CardEyebrow>Répartition</CardEyebrow>
      <p className="mb-5 font-serif text-xl font-semibold text-forest">
        D&apos;où vient votre revenu.
      </p>
      <m.div
        className="mb-5 flex h-5 gap-0.5 overflow-hidden rounded-full"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        aria-hidden
      >
        {channels.map((channel, index) => (
          <m.span
            key={channel.id}
            variants={growX}
            custom={index * STAGGER * 2}
            className={cn("h-full origin-left", colorOf(channel.id))}
            style={{ width: `${(channel.revenue / total) * 100}%` }}
          />
        ))}
      </m.div>
      <ul className="space-y-2.5 text-sm">
        {channels.map((channel) => (
          <li key={channel.id} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink">
              <span className={cn("size-2.5 rounded-sm", colorOf(channel.id))} aria-hidden />
              {channel.name}
            </span>
            <span className="font-semibold text-forest tabular-nums">
              {formatPercent((channel.revenue / total) * 100, 0)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const PLOT_HEIGHT = 180;

/** Nouveaux clients par canal dans le temps : colonnes empilées qui poussent depuis la base. */
export function ChannelEvolution({
  slots,
  channels,
}: {
  slots: ChannelSlot[];
  channels: ChannelRow[];
}) {
  const totals = slots.map((slot) =>
    Object.values(slot.customers).reduce((sum, value) => sum + value, 0),
  );
  const unit = PLOT_HEIGHT / (Math.max(...totals) || 1);

  return (
    <Card className="flex h-full min-w-0 flex-col">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <CardEyebrow>Évolution</CardEyebrow>
          <p className="font-serif text-xl font-semibold text-forest">
            Nouveaux clients par canal.
          </p>
        </div>
        <Legend channels={channels} />
      </div>
      <div
        className="-mx-2 overflow-x-auto rounded-lg px-2 pb-1 outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink"
        tabIndex={0}
        role="region"
        aria-label="Graphique des nouveaux clients par canal, défilable"
      >
        <m.div
          className="flex min-w-[460px] items-end gap-1.5 sm:gap-2.5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          aria-hidden
        >
          {slots.map((slot, index) => (
            <div
              key={slot.label + index}
              className="flex flex-1 flex-col items-center"
              title={`${slot.label} : ${totals[index]} nouveaux clients`}
            >
              <span className="mb-1 text-[11px] font-semibold text-slate tabular-nums">
                {totals[index]}
              </span>
              <div
                className="flex w-full max-w-9 flex-col justify-end"
                style={{ height: PLOT_HEIGHT }}
              >
                <m.div
                  variants={growY}
                  custom={index * STAGGER}
                  className="flex origin-bottom flex-col-reverse gap-px overflow-hidden rounded-t-md"
                >
                  {channels.map((channel) => (
                    <span
                      key={channel.id}
                      className={cn("block", colorOf(channel.id))}
                      style={{ height: (slot.customers[channel.id] ?? 0) * unit }}
                    />
                  ))}
                </m.div>
              </div>
              <span className="h-px w-full bg-ink/20" />
              <span className="mt-2 text-[11px] whitespace-nowrap text-slate">{slot.label}</span>
            </div>
          ))}
        </m.div>
      </div>
      <div className="sr-only">
        <table>
          <caption>Nouveaux clients par canal et par période</caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              {channels.map((channel) => (
                <th key={channel.id} scope="col">
                  {channel.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, index) => (
              <tr key={slot.label + index}>
                <th scope="row">{slot.label}</th>
                {channels.map((channel) => (
                  <td key={channel.id}>{slot.customers[channel.id] ?? 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SourceList({ rows }: { rows: SourceRow[] }) {
  const top = Math.max(...rows.map((row) => row.revenue)) || 1;
  return (
    <m.ol className="divide-y divide-line" variants={cascade} initial="hidden" animate="show">
      {rows.map((row, index) => (
        <m.li
          key={row.id}
          variants={fadeUp}
          className="grid grid-cols-1 gap-3 px-6 py-4 @3xl:grid-cols-[1.6fr_repeat(3,0.6fr)_1.2fr] @3xl:items-center"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.name}</p>
            <p className="truncate text-xs text-slate">{row.detail}</p>
          </div>
          <dl className="contents text-sm tabular-nums">
            {(
              [
                ["Visiteurs", formatNumber(row.visitors)],
                ["Inscrits", `${formatNumber(row.signups)} · ${rate(row.signups, row.visitors)}`],
                ["Clients", formatNumber(row.customers)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 @3xl:block @3xl:text-right">
                <dt className="text-slate @3xl:sr-only">{label}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
            <div className="@3xl:pl-6">
              <dt className="sr-only">Revenu mensuel gagné</dt>
              <dd className="mb-1.5 font-semibold text-forest">
                +{formatEuro(row.revenue)} / mois
              </dd>
              <GrowBar share={(row.revenue / top) * 100} delay={index * STAGGER} />
            </div>
          </dl>
        </m.li>
      ))}
    </m.ol>
  );
}

/** Détail par campagne et par page d'entrée. */
export function SourceTabs({
  campaigns,
  landingPages,
}: {
  campaigns: SourceRow[];
  landingPages: SourceRow[];
}) {
  return (
    <Card className="overflow-hidden p-0">
      <Tabs defaultValue="campaigns" className="gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
          <div>
            <CardEyebrow>Dans le détail</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              Ce qui fait vraiment venir vos clients.
            </p>
          </div>
          <TabsList aria-label="Choisir le détail">
            <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
            <TabsTrigger value="pages">Pages d&apos;entrée</TabsTrigger>
          </TabsList>
        </div>
        <div
          aria-hidden
          className="hidden grid-cols-[1.6fr_repeat(3,0.6fr)_1.2fr] gap-3 border-y border-line bg-cream/60 px-6 py-3 text-xs font-semibold text-slate @3xl:grid"
        >
          <span>Source</span>
          <span className="text-right">Visiteurs</span>
          <span className="text-right">Inscrits</span>
          <span className="text-right">Clients</span>
          <span className="pl-6">Revenu mensuel gagné</span>
        </div>
        <TabsContent value="campaigns">
          <SourceList rows={campaigns} />
        </TabsContent>
        <TabsContent value="pages">
          <SourceList rows={landingPages} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
