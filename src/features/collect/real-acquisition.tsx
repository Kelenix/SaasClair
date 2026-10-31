import { GrowBar } from "@/components/data/grow-bar";
import { Card, CardEyebrow } from "@/components/ui/card";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { SectionTitle } from "@/features/dashboard/page-header";
import { formatNumber, formatPercent } from "@/lib/format";
import { STAGGER } from "@/lib/motion";
import type { Kpi } from "@/features/dashboard/demo-data";
import type { RealAcquisition, Ranked } from "./aggregate";

/** Classement (canaux, pages, campagnes, sites d'origine) avec barres qui poussent. */
export function RankedCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Ranked[];
  empty: string;
}) {
  const top = rows[0]?.visitors || 1;
  return (
    <Card>
      <CardEyebrow>{title}</CardEyebrow>
      {rows.length === 0 ? (
        <p className="text-[15px] text-slate">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <li key={row.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold text-ink" title={row.name}>
                  {row.name}
                </span>
                <span className="shrink-0 text-slate tabular-nums">
                  {formatNumber(row.visitors)} · {formatPercent(row.share)}
                </span>
              </div>
              <GrowBar share={(row.visitors / top) * 100} delay={index * STAGGER} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Indicateurs des vraies visites (écran Acquisition et accueil). */
export function visitKpis(data: RealAcquisition): Kpi[] {
  const first = data.channels[0];
  return [
    {
      id: "visitors",
      label: "Visiteurs uniques",
      value: data.visitors,
      format: "number",
      delta: "sur la période",
      isGood: null,
      trend: data.trend,
    },
    {
      id: "pageviews",
      label: "Pages vues",
      value: data.pageviews,
      format: "number",
      delta: `${(data.pageviews / Math.max(1, data.visitors)).toFixed(1).replace(".", ",")} par visiteur`,
      isGood: null,
      trend: data.trend,
    },
    {
      id: "top-channel",
      label: first ? `Canal n° 1 : ${first.name}` : "Canal n° 1",
      value: first?.share ?? 0,
      format: "percent",
      delta: "des visiteurs",
      isGood: null,
      trend: data.trend,
    },
    {
      id: "mobile",
      label: "Visiteurs sur mobile",
      value: data.mobileShare,
      format: "percent",
      delta: "de vos visiteurs",
      isGood: null,
      trend: data.trend,
    },
  ];
}

/** Écran Acquisition sur les vraies visites reçues par le script. */
export function RealAcquisitionView({ data }: { data: RealAcquisition }) {
  return (
    <>
      <KpiCards kpis={visitKpis(data)} />

      <SectionTitle
        title="D'où viennent vos visiteurs"
        detail={
          <p className="text-sm text-slate">
            Les inscrits, clients et revenus par canal arrivent avec la connexion Stripe.
          </p>
        }
      />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <RankedCard title="Canaux" rows={data.channels} empty="Aucune visite sur la période." />
        <RankedCard
          title="Sites d'origine"
          rows={data.referrers}
          empty="Aucun site d'origine : vos visiteurs arrivent en direct."
        />
      </div>

      <SectionTitle title="Pages d'entrée et campagnes" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <RankedCard title="Pages d'entrée" rows={data.landingPages} empty="Aucune page vue." />
        <RankedCard
          title="Campagnes (utm_campaign)"
          rows={data.campaigns}
          empty="Aucune campagne : ajoutez utm_campaign à vos liens pour les suivre ici."
        />
      </div>
    </>
  );
}
