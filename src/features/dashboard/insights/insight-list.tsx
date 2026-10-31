"use client";

import { startTransition, useOptimistic, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CircleSlash,
  Hourglass,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatEuro } from "@/lib/format";
import { cascade, DURATION, EASE_OUT, fadeUp } from "@/lib/motion";
import { setInsightStatus } from "../actions";
import type { InsightStatus } from "../context";
import type { Insight } from "../demo-data";
import type { InsightEntry } from "./history";

type AreaFilter = Insight["area"] | "all";
type StatusFilter = "pending" | "done" | "ignored" | "all";

const AREAS: { value: AreaFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "Acquisition", label: "Acquisition" },
  { value: "Conversion", label: "Conversion" },
  { value: "Rétention", label: "Rétention" },
];

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "Tous",
  pending: "À traiter",
  done: "Faits",
  ignored: "Ignorés",
};

const matchesStatus = (status: InsightStatus | null, filter: StatusFilter) =>
  filter === "all" || (filter === "pending" ? status === null : status === filter);

/** Résultat d'un insight : à traiter, mesure en cours, impact mesuré, ou ignoré. */
function Outcome({ entry }: { entry: InsightEntry }) {
  if (entry.status === "ignored") {
    return (
      <Badge>
        <Icon icon={CircleSlash} className="size-3.5" /> Ignoré
      </Badge>
    );
  }
  if (entry.status === "done" && entry.measured === null) {
    return (
      <Badge tone="growth">
        <Icon icon={Hourglass} anim="tilt" className="size-3.5" /> Fait · mesure dans 14 jours
      </Badge>
    );
  }
  if (entry.status === "done") {
    return entry.measured ? (
      <Badge tone="growth">
        <Icon icon={TrendingUp} anim="bounce" className="size-3.5" /> +{formatEuro(entry.measured)}{" "}
        / mois mesurés
      </Badge>
    ) : (
      <Badge>
        <Icon icon={Check} className="size-3.5" /> Fait · pas d&apos;effet mesurable
      </Badge>
    );
  }
  return (
    <Badge tone="attention" pulse>
      À traiter
    </Badge>
  );
}

function InsightRow({
  entry,
  onChange,
}: {
  entry: InsightEntry;
  onChange: (status: InsightStatus | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(entry.isCurrent && entry.status === null);
  const detailId = `insight-${entry.id}`;

  return (
    <Card className="p-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={detailId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full cursor-pointer items-start justify-between gap-4 rounded-card p-5 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink sm:p-6"
      >
        <span className="min-w-0">
          <span className="mb-1.5 block eyebrow">{entry.area}</span>
          <span className="mb-3 block font-serif text-lg leading-snug font-semibold text-forest">
            {entry.title}
          </span>
          <Outcome entry={entry} />
        </span>
        <m.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: DURATION.micro }}
          className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-cream text-forest"
        >
          <ChevronDown className="size-4" aria-hidden />
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            id={detailId}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.screen, ease: EASE_OUT }}
            className="border-t border-line px-5 pt-4 pb-5 sm:px-6"
          >
            <p className="mb-4 text-[14px] text-ink">{entry.finding}</p>
            <dl className="mb-4 grid grid-cols-1 gap-3 text-[14px] @3xl:grid-cols-2">
              <div>
                <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate">
                  <Icon icon={Target} className="size-3.5" /> Cause probable
                </dt>
                <dd className="text-ink">{entry.cause}</dd>
              </div>
              <div className="rounded-xl border-l-4 border-gold bg-cream px-3.5 py-2.5">
                <dt className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-gold-ink">
                  <Icon icon={Sparkles} anim="pop" className="size-3.5" /> Action recommandée
                </dt>
                <dd className="text-ink">{entry.action}</dd>
              </div>
            </dl>
            <p className="mb-4 text-sm text-slate">
              Impact estimé : <strong className="text-forest">{entry.impact}</strong> · confiance{" "}
              {entry.confidence} · {entry.basis}
            </p>
            {entry.isCurrent &&
              (entry.status ? (
                <Button variant="link" size="sm" onClick={() => onChange(null)}>
                  Annuler mon choix
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onChange("done")}>
                    <Icon icon={Check} /> Fait
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onChange("ignored")}>
                    Ignorer
                  </Button>
                </div>
              ))}
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Filters({
  area,
  status,
  counts,
  onArea,
  onStatus,
  idSuffix,
}: {
  area: AreaFilter;
  status: StatusFilter;
  counts: Record<StatusFilter, number>;
  onArea: (area: AreaFilter) => void;
  onStatus: (status: StatusFilter) => void;
  idSuffix: string;
}) {
  return (
    <>
      <Segmented
        label="Filtrer par sujet"
        options={AREAS}
        value={area}
        onChange={onArea}
        pillId={`insight-area-${idSuffix}`}
      />
      <Segmented
        label="Filtrer par suivi"
        options={(Object.keys(STATUS_LABELS) as StatusFilter[]).map((value) => ({
          value,
          label: STATUS_LABELS[value],
          count: counts[value],
        }))}
        value={status}
        onChange={onStatus}
        pillId={`insight-status-${idSuffix}`}
      />
    </>
  );
}

/** Historique filtrable : sujets, suivi « fait / ignoré » et impact mesuré après action. */
export function InsightList({ entries }: { entries: InsightEntry[] }) {
  const [area, setArea] = useState<AreaFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [optimistic, applyOptimistic] = useOptimistic(
    entries,
    (current: InsightEntry[], change: { id: string; status: InsightStatus | null }) =>
      current.map((entry) =>
        entry.id === change.id ? { ...entry, status: change.status } : entry,
      ),
  );

  const change = (id: string, next: InsightStatus | null) =>
    startTransition(async () => {
      applyOptimistic({ id, status: next });
      const result = await setInsightStatus(id, next);
      if (!result.ok) toast.error(result.message);
      else if (next === "done") toast.success("Bravo. On mesure l'effet pour vous.");
    });

  const inArea = optimistic.filter((entry) => area === "all" || entry.area === area);
  const counts = Object.fromEntries(
    (Object.keys(STATUS_LABELS) as StatusFilter[]).map((key) => [
      key,
      inArea.filter((entry) => matchesStatus(entry.status, key)).length,
    ]),
  ) as Record<StatusFilter, number>;
  const visible = inArea.filter((entry) => matchesStatus(entry.status, status));
  const weeks = [...new Set(visible.map((entry) => entry.week))];
  const activeFilters = Number(area !== "all") + Number(status !== "all");
  const reset = () => {
    setArea("all");
    setStatus("all");
  };

  return (
    <div>
      <div className="mb-5 hidden flex-wrap gap-3 @3xl:flex">
        <Filters
          area={area}
          status={status}
          counts={counts}
          onArea={setArea}
          onStatus={setStatus}
          idSuffix="inline"
        />
      </div>

      {/* Mobile : les filtres glissent depuis le bas. */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="sm" className="mb-5 border-line bg-white @3xl:hidden">
            <Icon icon={SlidersHorizontal} anim="tilt" className="size-4" />
            Filtrer{activeFilters > 0 && ` · ${activeFilters} actif${activeFilters > 1 ? "s" : ""}`}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filtrer les insights</SheetTitle>
          </SheetHeader>
          <SheetBody className="space-y-4">
            <Filters
              area={area}
              status={status}
              counts={counts}
              onArea={setArea}
              onStatus={setStatus}
              idSuffix="sheet"
            />
          </SheetBody>
          <SheetFooter className="flex-row">
            <Button variant="ghost" className="flex-1" onClick={reset}>
              Tout afficher
            </Button>
            <Button className="flex-1" onClick={() => setIsSheetOpen(false)}>
              Voir {visible.length} insight{visible.length > 1 ? "s" : ""}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {visible.length === 0 ? (
        <Card>
          <StateMessage
            icon={SearchX}
            anim="wiggle"
            title="Aucun insight ne correspond."
            description="Changez de filtre pour retrouver vos recommandations."
            action={
              <Button variant="secondary" size="sm" onClick={reset}>
                Tout afficher
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {weeks.map((week) => (
            <section key={week} aria-label={week}>
              <h3 className="mb-3 text-sm font-semibold text-slate">{week}</h3>
              <m.ul
                className="grid grid-cols-1 items-start gap-3 @5xl:grid-cols-2"
                variants={cascade}
                initial="hidden"
                animate="show"
              >
                {visible
                  .filter((entry) => entry.week === week)
                  .map((entry) => (
                    <m.li key={entry.id} variants={fadeUp} className="min-w-0">
                      <InsightRow entry={entry} onChange={(next) => change(entry.id, next)} />
                    </m.li>
                  ))}
              </m.ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
