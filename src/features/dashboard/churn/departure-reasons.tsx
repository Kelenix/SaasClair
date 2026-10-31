import { Lightbulb } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Card, CardEyebrow } from "@/components/ui/card";
import { STAGGER } from "@/lib/motion";
import type { ChurnData, Reason } from "./data";

function ReasonList({
  title,
  basis,
  reasons,
  tone,
}: {
  title: string;
  basis: string;
  reasons: Reason[];
  tone: "forest" | "gold";
}) {
  const top = Math.max(...reasons.map((reason) => reason.share));
  return (
    <div className="min-w-0">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mb-4 text-xs text-slate">{basis}</p>
      <ul className="space-y-3.5">
        {reasons.map((reason, index) => (
          <li key={reason.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">{reason.label}</span>
              <span className="font-semibold text-forest tabular-nums">{reason.share} %</span>
            </div>
            <GrowBar
              share={(reason.share / top) * 100}
              delay={index * STAGGER}
              tone={index === 0 ? tone : "emerald"}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Raisons de départ : ce que les clients disent, et ce que leur usage montre. */
export function DepartureReasons({ reasons }: { reasons: ChurnData["reasons"] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardEyebrow>Raisons de départ</CardEyebrow>
      <p className="mb-5 font-serif text-xl font-semibold text-forest">
        Ce qu&apos;ils disent, et ce qu&apos;ils font.
      </p>
      <div className="grid grid-cols-1 gap-8 @lg:grid-cols-2">
        <ReasonList
          title="Déclarées"
          basis={reasons.declaredBasis}
          reasons={reasons.declared}
          tone="forest"
        />
        <ReasonList
          title="Observées"
          basis={reasons.observedBasis}
          reasons={reasons.observed}
          tone="gold"
        />
      </div>
      <p
        className="mt-6 flex gap-2.5 rounded-xl border-l-4 border-gold bg-cream px-3.5 py-3 text-[14px] text-ink"
        data-icon-trigger
      >
        <Icon icon={Lightbulb} anim="wiggle" className="mt-0.5 size-4 shrink-0 text-gold-ink" />
        <span>
          Ils parlent de prix, mais la plupart n&apos;utilisaient presque plus l&apos;outil.
          Relancez l&apos;usage avant de baisser vos tarifs.
        </span>
      </p>
    </Card>
  );
}
