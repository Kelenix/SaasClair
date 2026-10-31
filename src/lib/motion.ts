import type { Transition, Variants } from "motion/react";

// Mêmes valeurs que les variables CSS --dur-* et --ease-* de globals.css.
export const DURATION = {
  micro: 0.2, // micro-interactions : 150–250 ms
  screen: 0.4, // transitions d'écran : 300–500 ms
  data: 0.9, // révélation de données : 600–1 200 ms
} as const;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Ressort léger pour les éléments interactifs. */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 30, mass: 0.8 };

/** Décalage entre deux cartes d'une cascade (50–80 ms). */
export const STAGGER = 0.06;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.screen, ease: EASE_OUT } },
};

/**
 * Barres et jauges qui poussent (`custom` = délai en secondes). À déclencher depuis un parent
 * non transformé : un élément à l'échelle 0 n'a pas de surface et n'est jamais « vu ».
 */
export const growX: Variants = {
  hidden: { scaleX: 0 },
  show: (delay = 0) => ({
    scaleX: 1,
    transition: { duration: DURATION.data, ease: EASE_OUT, delay },
  }),
};

export const growY: Variants = {
  hidden: { scaleY: 0 },
  show: (delay = 0) => ({
    scaleY: 1,
    transition: { duration: DURATION.data, ease: EASE_OUT, delay },
  }),
};

export const cascade: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
};
