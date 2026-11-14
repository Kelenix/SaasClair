import { Badge } from "@/components/ui/badge";
import { CHANNEL_LABELS, type Channel } from "@/features/attribution/channels";
import { STATUS_LABELS, type SubscriptionStatus } from "./metrics";

// Petits formats partagés par la liste des utilisateurs et leur fiche.

const RELATIVE = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

/** « il y a 3 minutes », « hier »… (calculé au moment de l'affichage). */
export function lastActivity(iso: string | null) {
  if (!iso) return "jamais";
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (minutes > -60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -48) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}

const STATUS_TONE: Record<SubscriptionStatus, "growth" | "attention" | "neutral" | "danger"> = {
  trialing: "neutral",
  active: "growth",
  past_due: "attention",
  canceled: "neutral",
  suspended: "danger",
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} pulse={status === "past_due"}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export const channelLabel = (value: string) =>
  CHANNEL_LABELS[value as Channel] ?? CHANNEL_LABELS.direct;
