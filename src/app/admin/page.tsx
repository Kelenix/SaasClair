import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { BarChart } from "@/components/data/bar-chart";
import { GrowBar } from "@/components/data/grow-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { AdminHeader } from "@/features/admin/admin-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import {
  INTERVAL_LABELS,
  isOnline,
  PAYMENT_LABELS,
  PLAN_LABELS,
  summarize,
  type AdminProfile,
} from "@/features/admin/metrics";
import { getAdminProfiles } from "@/features/admin/queries";
import { CHANNEL_LABELS, type Channel } from "@/features/attribution/attribution";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { SectionTitle } from "@/features/dashboard/page-header";
import { formatEuro, formatPercent } from "@/lib/format";
import { STAGGER } from "@/lib/motion";

export const metadata: Metadata = { title: "Tableau de bord" };

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function Distribution({ rows }: { rows: { label: string; value: number }[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const top = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li key={row.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="text-ink">{row.label}</span>
            <span className="font-semibold text-forest tabular-nums">
              {row.value} · {formatPercent((row.value / total) * 100, 0)}
            </span>
          </div>
          <GrowBar share={(row.value / top) * 100} delay={index * STAGGER} />
        </li>
      ))}
    </ul>
  );
}

function PeopleList({ people, empty }: { people: AdminProfile[]; empty: string }) {
  if (!people.length) return <p className="py-4 text-sm text-slate">{empty}</p>;
  return (
    <ul>
      {people.map((person) => (
        <li
          key={person.id}
          className="flex items-center justify-between gap-3 border-t border-line py-2.5 first:border-t-0"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {person.first_name || person.email}
            </span>
            <span className="block truncate text-xs text-slate">
              {person.email} · {CHANNEL_LABELS[person.signup_channel as Channel] ?? "Accès direct"}
            </span>
          </span>
          <span className="shrink-0 text-xs text-slate">
            {DATE.format(new Date(person.created_at))}
          </span>
        </li>
      ))}
    </ul>
  );
}

async function AdminDashboard() {
  const profiles = await getAdminProfiles();
  const now = new Date();
  const summary = summarize(profiles, now);
  const growth = summary.newPrev30
    ? ((summary.newLast30 - summary.newPrev30) / summary.newPrev30) * 100
    : 0;
  const onlineNow = profiles.filter(
    (profile) => profile.role !== "super_admin" && isOnline(profile, now),
  );

  return (
    <>
      <AdminHeader
        title="Pilotage de SaasClair"
        description="Inscriptions, clients payants, revenu et provenance, calculés en direct depuis la base."
      />

      <KpiCards
        kpis={[
          {
            id: "users",
            label: "Utilisateurs inscrits",
            value: summary.total,
            format: "number",
            delta: `+${summary.newLast30} en 30 jours`,
            isGood: growth >= 0,
            trend: summary.signupsByWeek.map((week) => week.signups),
          },
          {
            id: "online",
            label: "Connectés maintenant",
            value: summary.online,
            format: "number",
            delta: "vus dans les 5 dernières minutes",
            isGood: null,
            trend: summary.signupsByWeek.map(() => summary.online),
          },
          {
            id: "paying",
            label: "Clients payants",
            value: summary.paying,
            format: "number",
            delta: `${formatPercent(summary.trialConversion, 0)} des essais convertis`,
            isGood: true,
            trend: summary.signupsByWeek.map((week) => week.paying),
          },
          {
            id: "mrr",
            label: "Revenu mensuel récurrent",
            value: summary.mrr,
            format: "euro",
            delta: `${formatEuro(summary.arpa)} par client`,
            isGood: true,
            trend: summary.mrrByMonth.map((month) => month.mrr),
          },
        ]}
      />

      <SectionTitle title="Évolution" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <Card className="min-w-0">
          <CardEyebrow>Inscriptions</CardEyebrow>
          <p className="mb-5 font-serif text-xl font-semibold text-forest">
            {summary.newLast30} nouveaux comptes en 30 jours
            {summary.newPrev30 > 0 && (
              <span className="ml-2 align-middle text-sm font-normal text-slate">
                ({growth >= 0 ? "+" : ""}
                {formatPercent(growth, 0)} vs les 30 jours d&apos;avant)
              </span>
            )}
          </p>
          <div
            className="-mx-2 overflow-x-auto rounded-lg px-2 outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink"
            tabIndex={0}
            role="region"
            aria-label="Inscriptions par semaine, défilable"
          >
            <BarChart
              className="min-w-[480px]"
              bars={summary.signupsByWeek.map((week) => ({
                label: week.label,
                value: week.signups,
              }))}
            />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardEyebrow>Revenu mensuel récurrent</CardEyebrow>
          <p className="mb-1 font-serif text-xl font-semibold text-forest">
            {formatEuro(summary.mrr)} par mois aujourd&apos;hui
          </p>
          <p className="mb-4 text-xs text-slate">
            Abonnés actuels déjà inscrits à la fin de chaque mois (estimation en attendant
            l&apos;historique de facturation).
          </p>
          <BarChart
            format="euro"
            bars={summary.mrrByMonth.map((month, index) => ({
              label: month.label,
              value: month.mrr,
              highlight: index === summary.mrrByMonth.length - 1,
            }))}
          />
        </Card>
      </div>

      <SectionTitle
        title="D'où viennent les utilisateurs"
        detail={
          <Link
            href="/admin/utilisateurs"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-forest underline-offset-4 hover:underline"
          >
            Tous les utilisateurs <Icon icon={ArrowRight} anim="nudge" className="size-4" />
          </Link>
        }
      />
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-cream/60 text-xs text-slate">
              <tr>
                <th scope="col" className="py-3 pl-6 font-semibold">
                  Canal d&apos;arrivée
                </th>
                <th scope="col" className="py-3 text-right font-semibold">
                  Inscrits
                </th>
                <th scope="col" className="py-3 text-right font-semibold">
                  Payants
                </th>
                <th scope="col" className="py-3 text-right font-semibold">
                  Conversion
                </th>
                <th scope="col" className="w-[30%] py-3 pr-6 pl-8 font-semibold">
                  Revenu mensuel
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.byChannel.map((row, index) => (
                <tr key={row.channel} className="border-b border-line last:border-0">
                  <th scope="row" className="py-3.5 pl-6 font-semibold text-ink">
                    {CHANNEL_LABELS[row.channel]}
                  </th>
                  <td className="py-3.5 text-right tabular-nums">{row.users}</td>
                  <td className="py-3.5 text-right tabular-nums">{row.paying}</td>
                  <td className="py-3.5 text-right text-slate tabular-nums">
                    {formatPercent((row.paying / row.users) * 100, 0)}
                  </td>
                  <td className="py-3.5 pr-6 pl-8">
                    <span className="mb-1 block font-semibold text-forest tabular-nums">
                      {formatEuro(row.mrr)}
                    </span>
                    <GrowBar
                      share={(row.mrr / Math.max(summary.byChannel[0]?.mrr ?? 1, 1)) * 100}
                      delay={index * STAGGER}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionTitle title="Abonnements payants" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
        <Card>
          <CardEyebrow>Par offre</CardEyebrow>
          <Distribution
            rows={summary.byPlan.map(([plan, value]) => ({ label: PLAN_LABELS[plan], value }))}
          />
        </Card>
        <Card>
          <CardEyebrow>Par moyen de paiement</CardEyebrow>
          <Distribution
            rows={summary.byPayment.map(([method, value]) => ({
              label: PAYMENT_LABELS[method],
              value,
            }))}
          />
        </Card>
        <Card>
          <CardEyebrow>Par rythme</CardEyebrow>
          <Distribution
            rows={summary.byInterval.map(([interval, value]) => ({
              label: INTERVAL_LABELS[interval],
              value,
            }))}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="growth">{summary.trialing} en essai</Badge>
            {summary.pastDue > 0 && (
              <Badge tone="attention" pulse>
                {summary.pastDue} paiements en retard
              </Badge>
            )}
            <Badge>{summary.canceled} résiliés</Badge>
          </div>
        </Card>
      </div>

      <SectionTitle title="À suivre" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
        <Card>
          <CardEyebrow>Connectés maintenant</CardEyebrow>
          <PeopleList people={onlineNow} empty="Personne pour l'instant." />
        </Card>
        <Card>
          <CardEyebrow>Essais qui se terminent sous 3 jours</CardEyebrow>
          <PeopleList
            people={summary.trialsEndingSoon}
            empty="Aucun essai ne se termine bientôt."
          />
        </Card>
        <Card>
          <CardEyebrow>Dernières inscriptions</CardEyebrow>
          <PeopleList people={summary.latest} empty="Aucune inscription pour l'instant." />
        </Card>
      </div>
    </>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Tableau de bord" />}>
      <AdminDashboard />
    </Suspense>
  );
}
