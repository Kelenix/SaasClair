import Image from "next/image";
import { cn } from "@/lib/utils";

// Fichiers fournis, détourés par scripts/process-logos.mjs (jamais redessinés).
const LOGOS = {
  full: { src: "/brand/wordmark.png", width: 1518, height: 269 },
  inverse: { src: "/brand/wordmark-inverse.png", width: 1518, height: 269 },
  mark: { src: "/brand/monogram.png", width: 512, height: 512 },
} as const;

type LogoProps = {
  /** full : fond clair · inverse : fond vert forêt · mark : monogramme seul */
  variant?: keyof typeof LOGOS;
  className?: string;
  priority?: boolean;
};

export function Logo({ variant = "full", className, priority }: LogoProps) {
  const { src, width, height } = LOGOS[variant];
  return (
    <Image
      src={src}
      width={width}
      height={height}
      alt="SaasClair"
      priority={priority}
      // Affiché à 28 px de haut sur le site (158 px de large) : le navigateur choisit l'image à
      // cette taille (14 Ko sur un téléphone courant au lieu de 29 Ko), jamais celle de 1 920 px.
      sizes={variant === "mark" ? "96px" : "160px"}
      // Taille minimale du brand kit : 120 px de large pour le logo, 24 px pour le monogramme.
      className={cn(variant === "mark" ? "size-8 min-w-6" : "h-7 w-auto min-w-[120px]", className)}
    />
  );
}
