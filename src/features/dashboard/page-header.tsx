import { LiveDot } from "@/components/data/live-dot";
import { PERIOD_LABELS, type Period } from "./period";

/** En-tête d'écran : titre, résumé en une phrase et indicateur « en direct ». */
export function PageHeader({
  title,
  summary,
  period,
  liveLabel,
}: {
  title: React.ReactNode;
  summary: React.ReactNode;
  period: Period;
  liveLabel: string;
}) {
  return (
    <header className="mb-7">
      <h1 className="mb-2 text-[34px] sm:text-[42px]">{title}</h1>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[17px] text-slate">
        {summary}
        <LiveDot label={`${liveLabel} · ${PERIOD_LABELS[period]}`} />
      </p>
    </header>
  );
}

export function SectionTitle({
  title,
  detail,
  id,
}: {
  title: string;
  detail?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 id={id} className="text-2xl">
        {title}
      </h2>
      {detail}
    </div>
  );
}
