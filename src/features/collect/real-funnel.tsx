import { Sparkles, Target } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { KpiCards } from "@/features/dashboard/home/kpi-cards";
import { SectionTitle } from "@/features/dashboard/page-header";
import { FunnelChart } from "@/features/dashboard/tunnel/tunnel-views";
import { formatNumber, formatPercent } from "@/lib/format";
import { STEP_ADVICE, type RealFunnel, type Segment } from "./funnel";

/** Résumé en une phrase : le chiffre d'abord, l'étape à corriger ensuite. */
export function funnelSummary(funnel: RealFunnel) {
  const last = funnel.steps.at(-1)!;
  if (funnel.steps.length === 1) {
    return `${formatNumber(funnel.visitors)} visiteurs sur la période. Indiquez vos pages clés pour dessiner le tunnel.`;
  }
  const rate = funnel.visitors ? (last.count / funnel.visitors) * 100 : 0;
  const weakest = funnel.steps[funnel.weakest];
  return `${formatPercent(rate)} de vos visiteurs atteignent l'étape « ${last.label} ».${
    weakest ? ` La plus forte perte : avant « ${weakest.label} ».` : ""
  }`;
}

function WeakestCard({ funnel }: { funnel: RealFunnel }) {
  const step = funnel.steps[funnel.weakest];
  const previous = funnel.steps[funnel.weakest - 1];
  if (!step || !previous || step.id === "visit") return null;
  const advice = STEP_ADVICE[step.id];
  const rate = previous.count ? (step.count / previous.count) * 100 : 0;
  return (
    <Card className="flex h-full flex-col border-gold/60">
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardEyebrow className="mb-0">Étape à corriger en premier</CardEyebrow>
        <Badge tone="attention" pulse>
          {step.label}
        </Badge>
      </div>
      <p className="mb-3 font-serif text-xl font-semibold text-forest">{advice.title}</p>
      <p className="mb-4 text-sm text-ink">
        {formatPercent(rate)} seulement passent de « {previous.label} » à « {step.label} » :{" "}
        {formatNumber(previous.count - step.count)} visiteurs perdus sur la période.
      </p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate">
            <Icon icon={Target} className="size-3.5" /> Cause probable
          </dt>
          <dd className="text-ink">{advice.cause}</dd>
        </div>
        <div className="rounded-xl border-l-4 border-gold bg-cream px-3.5 py-2.5">
          <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-gold-ink">
            <Icon icon={Sparkles} anim="pop" className="size-3.5" /> Action recommandée
          </dt>
          <dd className="text-ink">{advice.action}</dd>
        </div>
      </dl>
    </Card>
  );
}

/** Segments assez grands pour comparer (sinon un seul visiteur ferait passer à 0 % ou 100 %). */
const MIN_SEGMENT = 20;

function SegmentCard({
  title,
  segments,
  label,
}: {
  title: string;
  segments: Segment[];
  label: string;
}) {
  const comparable = segments.filter((segment) => segment.visitors >= MIN_SEGMENT);
  const worst =
    comparable.length > 1 ? comparable.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  return (
    <Card>
      <CardEyebrow>{title}</CardEyebrow>
      {segments.length ? (
        <ul className="flex flex-col gap-3">
          {segments.slice(0, 5).map((segment) => {
            const isWorst = worst?.id === segment.id;
            return (
              <li key={segment.id}>
                <p className="mb-1 flex justify-between gap-3 text-sm">
                  <span className={isWorst ? "font-semibold text-gold-ink" : "text-ink"}>
                    {segment.name}
                    <span className="text-xs text-slate">
                      {" "}
                      · {formatNumber(segment.visitors)} visiteurs
                    </span>
                  </span>
                  <span className="font-semibold text-forest tabular-nums">
                    {formatPercent(segment.rate)}
                  </span>
                </p>
                <GrowBar share={segment.rate} tone={isWorst ? "gold" : undefined} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate">Pas encore assez de visites.</p>
      )}
      <p className="mt-4 text-xs text-slate">
        Part des visiteurs qui atteignent « {label} ».
        {worst && ` En or : l'écart le plus important.`}
      </p>
    </Card>
  );
}

/** Tunnel sur les vraies visites : étapes, étape à corriger, et comparaison appareil / canal. */
export function RealTunnel({ funnel }: { funnel: RealFunnel }) {
  const flat = (value: number) => [value, value];
  const last = funnel.steps.at(-1)!;
  return (
    <>
      <KpiCards
        kpis={funnel.steps.map((step, index) => ({
          id: step.id,
          label: step.label,
          value: step.count,
          format: "number",
          delta:
            index === 0
              ? "sur la période"
              : `${formatPercent(funnel.visitors ? (step.count / funnel.visitors) * 100 : 0)} des visiteurs`,
          isGood: index === funnel.weakest ? false : null,
          trend: flat(step.count),
        }))}
      />
      {funnel.steps.length > 1 && (
        <>
          <SectionTitle title="Où vos visiteurs s'arrêtent" />
          <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-[1.5fr_1fr]">
            <FunnelChart funnel={funnel.steps} weakest={funnel.weakest} />
            <WeakestCard funnel={funnel} />
          </div>
          <SectionTitle title="Par appareil et par canal" />
          <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
            <SegmentCard title="Appareil" segments={funnel.segments.device} label={last.label} />
            <SegmentCard title="Canal" segments={funnel.segments.channel} label={last.label} />
          </div>
        </>
      )}
    </>
  );
}
