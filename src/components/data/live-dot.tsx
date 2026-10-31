import { cn } from "@/lib/utils";

/** Point « en direct » qui pulse doucement, pour les données temps réel. */
export function LiveDot({
  label = "En direct",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-semibold text-emerald-ink",
        className,
      )}
    >
      <span className="pulse-ring size-2 rounded-full bg-emerald text-emerald" aria-hidden />
      {label}
    </span>
  );
}
