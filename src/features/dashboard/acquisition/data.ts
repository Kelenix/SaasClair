// Écran « Acquisition » : d'où viennent les clients, et lesquels rapportent vraiment.

import { formatNumber } from "@/lib/format";
import { getChannels, type Channel, type Kpi } from "../demo-data";
import { scale, seeded, timeSlots, trend } from "../demo-utils";
import type { Period } from "../period";

export type ChannelRow = Channel & {
  /** Churn mensuel des clients venus de ce canal (%). */
  churn: number;
};
export type SourceRow = {
  id: string;
  name: string;
  detail: string;
  visitors: number;
  signups: number;
  customers: number;
  revenue: number;
};
export type ChannelSlot = { label: string; customers: Record<string, number> };

export type AcquisitionData = {
  summary: string;
  kpis: Kpi[];
  channels: ChannelRow[];
  evolution: ChannelSlot[];
  campaigns: SourceRow[];
  landingPages: SourceRow[];
};

const CHANNEL_CHURN: Record<string, number> = {
  seo: 6,
  linkedin: 3,
  direct: 7,
  partners: 5,
  instagram: 9,
};

/** Part des clients payants reliés à leur provenance (affichée honnêtement). */
export const COVERAGE = 91;

// Volumes sur 30 jours.
const CAMPAIGNS_30D: SourceRow[] = [
  {
    id: "cas-client-cobalt",
    name: "Cas client Atelier Cobalt",
    detail: "LinkedIn · publication",
    visitors: 1240,
    signups: 118,
    customers: 9,
    revenue: 2900,
  },
  {
    id: "newsletter-octobre",
    name: "Newsletter d'octobre",
    detail: "Email",
    visitors: 860,
    signups: 64,
    customers: 5,
    revenue: 1450,
  },
  {
    id: "webinar-planning",
    name: "Webinaire « Planning hybride »",
    detail: "LinkedIn · événement",
    visitors: 540,
    signups: 71,
    customers: 6,
    revenue: 1700,
  },
  {
    id: "programme-partenaires",
    name: "Programme partenaires comptables",
    detail: "Partenaires",
    visitors: 980,
    signups: 88,
    customers: 6,
    revenue: 2300,
  },
  {
    id: "reels-automne",
    name: "Reels d'automne",
    detail: "Instagram · publicité",
    visitors: 1650,
    signups: 104,
    customers: 2,
    revenue: 620,
  },
];

const LANDING_PAGES_30D: SourceRow[] = [
  {
    id: "home",
    name: "Accueil",
    detail: "/",
    visitors: 6100,
    signups: 390,
    customers: 22,
    revenue: 7100,
  },
  {
    id: "blog-planning",
    name: "Guide du planning d'équipe hybride",
    detail: "/blog/planning-equipe-hybride",
    visitors: 3900,
    signups: 240,
    customers: 15,
    revenue: 4600,
  },
  {
    id: "tarifs",
    name: "Tarifs",
    detail: "/tarifs",
    visitors: 2300,
    signups: 260,
    customers: 17,
    revenue: 5300,
  },
  {
    id: "cas-clients",
    name: "Cas clients",
    detail: "/cas-clients",
    visitors: 1500,
    signups: 150,
    customers: 11,
    revenue: 3900,
  },
  {
    id: "fonction-planning",
    name: "Fonction Planning",
    detail: "/fonctionnalites/planning",
    visitors: 1800,
    signups: 120,
    customers: 6,
    revenue: 1700,
  },
];

const scaleRow = (row: SourceRow, period: Period): SourceRow => ({
  ...row,
  visitors: scale(row.visitors, period),
  signups: scale(row.signups, period),
  customers: Math.max(1, scale(row.customers, period)),
  revenue: scale(row.revenue, period),
});

export function getAcquisitionData(period: Period, now = new Date()): AcquisitionData {
  const random = seeded(`acquisition-${period}`);
  const channels = getChannels(period).map((channel) => ({
    ...channel,
    churn: CHANNEL_CHURN[channel.id] ?? 7,
  }));
  const total = (key: "visitors" | "signups" | "customers") =>
    channels.reduce((sum, channel) => sum + channel[key], 0);
  const visitors = total("visitors");
  const signups = total("signups");
  const customers = total("customers");

  const vary = (value: number) => Math.max(0, Math.round(value * (0.7 + random() * 0.6)));
  const base = getChannels("30j");
  const evolution = timeSlots(period, now).map(({ label, share }) => ({
    label,
    customers: Object.fromEntries(
      base.map((channel) => [channel.id, vary(channel.customers * share)]),
    ),
  }));

  return {
    summary: `${channels[0].name} vous apporte le plus de revenu. Les clients venus de LinkedIn restent le plus longtemps.`,
    kpis: [
      {
        id: "visitors",
        label: "Visiteurs",
        value: visitors,
        format: "number",
        delta: "+8 %",
        isGood: true,
        trend: trend(visitors * 0.9, visitors, 12, random, 0.05),
      },
      {
        id: "signups",
        label: "Inscriptions",
        value: signups,
        format: "number",
        delta: "+5 %",
        isGood: true,
        trend: trend(signups * 0.94, signups, 12, random, 0.05),
      },
      {
        id: "customers",
        label: "Nouveaux clients payants",
        value: customers,
        format: "number",
        delta: `1 client pour ${formatNumber(Math.round(visitors / customers))} visiteurs`,
        isGood: null,
        trend: trend(customers * 0.95, customers, 12, random, 0.06),
      },
      {
        id: "coverage",
        label: "Clients reliés à leur provenance",
        value: COVERAGE,
        format: "percent",
        delta: "+2 pt ce mois",
        isGood: true,
        trend: trend(COVERAGE - 6, COVERAGE, 12, random, 0.01),
      },
    ],
    channels,
    evolution,
    campaigns: CAMPAIGNS_30D.map((row) => scaleRow(row, period)),
    landingPages: LANDING_PAGES_30D.map((row) => scaleRow(row, period)),
  };
}
