import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Card, CardEyebrow } from "@/components/ui/card";
import { AdminHeader } from "@/features/admin/admin-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import {
  INTERVAL_LABELS,
  LIST_PRICES,
  monthlyRevenue,
  PAYMENT_LABELS,
  PLAN_LABELS,
  PRO_DEFAULT_PRICE,
  summarize,
  type AdminProfile,
  type PaymentMethod,
  type PlanId,
} from "@/features/admin/metrics";
import { getAdminProfiles } from "@/features/admin/queries";
import { StatusBadge } from "@/features/admin/user-format";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { SectionTitle } from "@/features/dashboard/page-header";
import { annualMonthlyPrice } from "@/features/marketing/pricing-math";
import { formatEuro } from "@/lib/format";
import { STAGGER } from "@/lib/motion";

export const metadata: Metadata = { title: "Abonnements" };

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const PAID_PLANS: Exclude<PlanId, "trial">[] = ["starter", "growth", "pro"];

function Attention({
  title,
  people,
  detail,
  empty,
}: {
  title: string;
  people: AdminProfile[];
  detail: (person: AdminProfile) => string;
  empty: string;
}) {
  return (
    <Card>
      <CardEyebrow>{title}</CardEyebrow>
      {people.length === 0 ? (
        <p className="py-3 text-sm text-slate">{empty}</p>
      ) : (
        <ul>
          {people.map((person) => (
            <li key={person.id} className="border-t border-line first:border-t-0">
              <Link
                href={`/admin/utilisateurs?q=${encodeURIComponent(person.email)}`}
                className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-cream"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {person.first_name || person.email}
                  </span>
                  <span className="block truncate text-xs text-slate">{detail(person)}</span>
                </span>
                <Icon icon={ChevronRight} anim="nudge" className="size-4 shrink-0 text-slate" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function AdminSubscriptions() {
  const profiles = await getAdminProfiles();
  const now = new Date();
  const summary = summarize(profiles, now);
  const customers = profiles.filter((profile) => profile.role !== "super_admin");
  const billed = customers.filter((profile) =>
    ["active", "past_due"].includes(profile.subscription_status),
  );

  const plans = PAID_PLANS.map((plan) => {
    const group = billed.filter((profile) => profile.plan === plan);
    return {
      plan,
      price:
        plan === "pro"
          ? `sur devis (${formatEuro(PRO_DEFAULT_PRICE)} par défaut)`
          : `${formatEuro(LIST_PRICES[plan])} · ${formatEuro(annualMonthlyPrice(LIST_PRICES[plan]))} en annuel`,
      monthly: group.filter((profile) => profile.billing_interval !== "annual").length,
      annual: group.filter((profile) => profile.billing_interval === "annual").length,
      mrr: group.reduce((sum, profile) => sum + monthlyRevenue(profile), 0),
    };
  });
  const topPlanMrr = Math.max(...plans.map((row) => row.mrr), 1);

  const methods = (Object.keys(PAYMENT_LABELS) as PaymentMethod[])
    .map((method) => {
      const group = billed.filter((profile) => profile.payment_method === method);
      return {
        method,
        count: group.length,
        mrr: group.reduce((sum, profile) => sum + monthlyRevenue(profile), 0),
      };
    })
    .sort((a, b) => b.mrr - a.mrr);
  const topMethodMrr = Math.max(...methods.map((row) => row.mrr), 1);

  const pastDue = customers.filter((profile) => profile.subscription_status === "past_due");
  const recentCancellations = customers
    .filter((profile) => profile.subscription_status === "canceled")
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 6);

  return (
    <>
      <AdminHeader
        title="Abonnements"
        description="Qui paie quoi, à quel rythme et comment. Les abonnements se gèrent depuis la fiche de chaque utilisateur."
      />

      <KpiCards
        kpis={[
          {
            id: "mrr",
            label: "Revenu mensuel récurrent",
            value: summary.mrr,
            format: "euro",
            delta: `${formatEuro(summary.mrr * 12)} par an`,
            isGood: true,
            trend: summary.mrrByMonth.map((month) => month.mrr),
          },
          {
            id: "paying",
            label: "Abonnés actifs",
            value: summary.paying,
            format: "number",
            delta: `${formatEuro(summary.arpa)} en moyenne`,
            isGood: true,
            trend: summary.signupsByWeek.map((week) => week.paying),
          },
          {
            id: "past-due",
            label: "Paiements en retard",
            value: summary.pastDue,
            format: "number",
            delta: `${formatEuro(pastDue.reduce((sum, profile) => sum + monthlyRevenue(profile), 0))} par mois en jeu`,
            isGood: summary.pastDue === 0 ? null : false,
            trend: summary.signupsByWeek.map(() => summary.pastDue),
          },
          {
            id: "trialing",
            label: "Essais en cours",
            value: summary.trialing,
            format: "number",
            delta: `${summary.trialsEndingSoon.length} se terminent sous 3 jours`,
            isGood: null,
            trend: summary.signupsByWeek.map((week) => week.signups),
          },
        ]}
      />

      <SectionTitle title="Par offre" />
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line bg-cream/60 text-xs text-slate">
              <tr>
                <th scope="col" className="py-3 pl-6 font-semibold">
                  Offre
                </th>
                <th scope="col" className="py-3 font-semibold">
                  Prix catalogue (par mois)
                </th>
                <th scope="col" className="py-3 text-right font-semibold">
                  {INTERVAL_LABELS.monthly}
                </th>
                <th scope="col" className="py-3 text-right font-semibold">
                  {INTERVAL_LABELS.annual}
                </th>
                <th scope="col" className="w-[28%] py-3 pr-6 pl-8 font-semibold">
                  Revenu mensuel
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((row, index) => (
                <tr key={row.plan} className="border-b border-line last:border-0">
                  <th scope="row" className="py-3.5 pl-6 font-semibold text-ink">
                    {PLAN_LABELS[row.plan]}
                  </th>
                  <td className="py-3.5 text-slate">{row.price}</td>
                  <td className="py-3.5 text-right tabular-nums">{row.monthly}</td>
                  <td className="py-3.5 text-right tabular-nums">{row.annual}</td>
                  <td className="py-3.5 pr-6 pl-8">
                    <span className="mb-1 block font-semibold text-forest tabular-nums">
                      {formatEuro(row.mrr)}
                    </span>
                    <GrowBar share={(row.mrr / topPlanMrr) * 100} delay={index * STAGGER} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-2 text-xs text-slate">
        Les prix se modifient dans Stripe une fois la facturation branchée ; ceux du site vitrine
        suivent le catalogue.
      </p>

      <SectionTitle title="Par moyen de paiement" />
      <Card>
        <ul className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
          {methods.map((row, index) => (
            <li key={row.method}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="text-ink">
                  {PAYMENT_LABELS[row.method]}{" "}
                  <span className="text-slate">
                    · {row.count} abonné{row.count > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="font-semibold text-forest tabular-nums">
                  {formatEuro(row.mrr)}
                </span>
              </div>
              <GrowBar share={(row.mrr / topMethodMrr) * 100} delay={index * STAGGER} />
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle title="À traiter" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
        <Attention
          title="Paiements en retard"
          people={pastDue}
          empty="Aucun paiement en retard."
          detail={(person) =>
            `${formatEuro(monthlyRevenue(person))} / mois · ${PLAN_LABELS[person.plan]}`
          }
        />
        <Attention
          title="Essais qui se terminent"
          people={summary.trialsEndingSoon}
          empty="Aucun essai ne se termine sous 3 jours."
          detail={(person) => `Fin le ${DATE.format(new Date(person.trial_ends_at))}`}
        />
        <Attention
          title="Résiliations récentes"
          people={recentCancellations}
          empty="Aucune résiliation."
          detail={(person) => `${PLAN_LABELS[person.plan]} · ${person.email}`}
        />
      </div>

      {pastDue.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate">
          Statut actuel : <StatusBadge status="past_due" /> {pastDue.length} client
          {pastDue.length > 1 ? "s" : ""} à relancer.
        </p>
      )}
    </>
  );
}

export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Abonnements" />}>
      <AdminSubscriptions />
    </Suspense>
  );
}
