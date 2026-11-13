"use client";

import { startTransition, useOptimistic } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { Check, CircleSlash, Inbox, Sparkles, Target, TrendingUp } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Cascade, CascadeItem } from "@/components/motion/reveal";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { setInsightStatus } from "../actions";
import type { InsightStatus } from "../context";
import type { Insight } from "../demo-data";

type Feedback = Record<string, InsightStatus>;

const DONE_MESSAGE: Record<InsightStatus, string> = {
  done: "Marqué comme fait. Nous mesurerons l'effet dans 14 jours.",
  ignored: "Ignoré. Nous ne vous le reproposerons pas.",
};
// Vraies données : pas encore de mesure d'effet, on ne la promet pas.
const REAL_DONE_MESSAGE: Record<InsightStatus, string> = {
  done: "Marqué comme fait. Bravo.",
  ignored: "Ignoré. Nous ne vous le reproposerons pas cette semaine.",
};

function InsightCard({
  insight,
  status,
  measurable,
  onChange,
}: {
  insight: Insight & { href?: string };
  status: InsightStatus | undefined;
  measurable: boolean;
  onChange: (status: InsightStatus | null) => void;
}) {
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="mb-0 eyebrow">{insight.area}</p>
        <Badge
          tone={insight.confidence === "élevée" ? "growth" : "neutral"}
          className="text-[11px]"
        >
          Confiance {insight.confidence}
        </Badge>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {status ? (
          <m.div
            key="handled"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.screen, ease: EASE_OUT }}
            className="flex flex-1 flex-col items-start justify-center gap-3"
          >
            <span className="grid size-10 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
              <Icon icon={status === "done" ? Check : CircleSlash} anim="pop" />
            </span>
            <p className="font-serif text-lg font-semibold text-forest">{insight.title}</p>
            <p className="text-sm text-slate">
              {(measurable ? DONE_MESSAGE : REAL_DONE_MESSAGE)[status]}
            </p>
            <Button variant="link" size="sm" onClick={() => onChange(null)}>
              Annuler
            </Button>
          </m.div>
        ) : (
          <m.div
            key="open"
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.micro }}
            className="flex flex-1 flex-col"
          >
            <h3 className="mb-2 text-[21px] leading-snug">{insight.title}</h3>
            <p className="mb-4 text-[14px] text-ink">{insight.finding}</p>
            <dl className="mb-5 space-y-3 text-[14px]">
              <div>
                <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate">
                  <Icon icon={Target} className="size-3.5" /> Cause probable
                </dt>
                <dd className="text-ink">{insight.cause}</dd>
              </div>
              <div className="rounded-xl border-l-4 border-gold bg-cream px-3.5 py-2.5">
                <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-gold-ink">
                  <Icon icon={Sparkles} anim="pop" className="size-3.5" /> Action recommandée
                </dt>
                <dd className="text-ink">{insight.action}</dd>
              </div>
            </dl>
            <p className="mt-auto mb-4 flex items-center gap-2 text-sm">
              <Icon icon={TrendingUp} anim="bounce" className="size-4 text-emerald-ink" />
              <span>
                <strong className="text-forest">{insight.impact}</strong>
                <span className="text-slate"> · {insight.basis}</span>
              </span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onChange("done")}>
                <Icon icon={Check} /> Fait
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onChange("ignored")}>
                Ignorer
              </Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/** Les 3 insights de la semaine ; « Fait » et « Ignorer » répondent instantanément (interface optimiste). */
export function InsightCards({
  insights,
  feedback,
  measurable = true,
}: {
  insights: (Insight & { href?: string })[];
  feedback: Feedback;
  /** Démonstration : effet mesuré 14 jours après. Vraies données : pas encore de mesure. */
  measurable?: boolean;
}) {
  const [optimistic, applyOptimistic] = useOptimistic(
    feedback,
    (current: Feedback, change: { id: string; status: InsightStatus | null }) => {
      const next = { ...current };
      if (change.status) next[change.id] = change.status;
      else delete next[change.id];
      return next;
    },
  );

  const change = (id: string, status: InsightStatus | null) =>
    startTransition(async () => {
      applyOptimistic({ id, status });
      const result = await setInsightStatus(id, status);
      if (!result.ok) toast.error(result.message);
      else if (status === "done")
        toast.success(measurable ? "Bravo. On mesure l'effet pour vous." : "Bravo, c'est noté.");
    });

  if (insights.length === 0) {
    return (
      <Card>
        <StateMessage
          icon={Inbox}
          title="Pas de nouvel insight cette semaine."
          description="Tout est stable. Nous vous prévenons dès qu'un chiffre mérite votre attention."
        />
      </Card>
    );
  }

  return (
    <Cascade className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
      {insights.map((insight) => (
        <CascadeItem key={insight.id} className="h-full">
          <InsightCard
            insight={insight}
            status={optimistic[insight.id]}
            measurable={measurable}
            onChange={(status) => change(insight.id, status)}
          />
        </CascadeItem>
      ))}
    </Cascade>
  );
}
