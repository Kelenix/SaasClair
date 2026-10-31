"use client";

import { m, type HTMLMotionProps } from "motion/react";
import { cascade, fadeUp } from "@/lib/motion";

const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;

/** Apparaît en glissant vers le haut quand il entre à l'écran. */
export function Reveal(props: HTMLMotionProps<"div">) {
  return (
    <m.div variants={fadeUp} initial="hidden" whileInView="show" viewport={VIEWPORT} {...props} />
  );
}

/** Conteneur dont les enfants <CascadeItem> apparaissent l'un après l'autre (60 ms d'écart). */
export function Cascade(props: HTMLMotionProps<"div">) {
  return (
    <m.div variants={cascade} initial="hidden" whileInView="show" viewport={VIEWPORT} {...props} />
  );
}

export function CascadeItem(props: HTMLMotionProps<"div">) {
  return <m.div variants={fadeUp} {...props} />;
}
