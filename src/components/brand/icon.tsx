import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconAnimation = "pop" | "wiggle" | "nudge" | "bounce" | "spin" | "tilt";

type IconProps = {
  icon: LucideIcon;
  /** Animation jouée au survol ou au focus de l'icône ou de son lien / bouton parent. */
  anim?: IconAnimation;
  className?: string;
  /** Texte lu par les lecteurs d'écran ; sans lui, l'icône est décorative. */
  label?: string;
};

/**
 * Icône toujours animée : elle apparaît avec un léger ressort, réagit au survol et
 * se contracte au clic (animations CSS de globals.css, sans JavaScript).
 */
export function Icon({ icon: Glyph, anim = "pop", className, label }: IconProps) {
  return (
    <span className="icon" data-anim={anim}>
      <Glyph
        className={cn("size-5", className)}
        strokeWidth={1.75}
        aria-hidden={!label}
        aria-label={label}
        role={label ? "img" : undefined}
      />
    </span>
  );
}
