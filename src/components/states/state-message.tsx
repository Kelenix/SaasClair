import type { LucideIcon } from "lucide-react";
import { Icon, type IconAnimation } from "@/components/brand/icon";
import { cn } from "@/lib/utils";

type StateMessageProps = {
  icon: LucideIcon;
  anim?: IconAnimation;
  title: string;
  description: string;
  /** Bouton ou lien d'action (« Réessayer », « Installer le script »…). */
  action?: React.ReactNode;
  tone?: "calm" | "error";
  className?: string;
};

/**
 * États vide et erreur : une illustration animée, un message encourageant, une action.
 * Les erreurs sont annoncées aux lecteurs d'écran (role="alert").
 */
export function StateMessage({
  icon,
  anim = "bounce",
  title,
  description,
  action,
  tone = "calm",
  className,
}: StateMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}
    >
      <span
        className={cn(
          "pulse-soft mb-2 grid size-16 place-items-center rounded-full",
          tone === "error" ? "bg-gold-tint text-gold-ink" : "bg-emerald-tint text-emerald-ink",
        )}
        data-icon-trigger
      >
        <Icon icon={icon} anim={anim} className="size-7" />
      </span>
      <p className="font-serif text-xl font-semibold text-forest">{title}</p>
      <p className="max-w-sm text-[15px] text-slate">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
