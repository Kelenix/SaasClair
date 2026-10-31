"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { displaySiteUrl } from "@/lib/site-url";

const PARTICLE_COUNT = 28;
const PARTICLE_COLORS = ["var(--emerald)", "var(--gold)", "var(--forest)", "var(--emerald)"];

// Positions calculées (et non aléatoires) : identiques au serveur et au navigateur.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + (index % 3) * 0.18;
  const distance = 110 + ((index * 37) % 90);
  return {
    // Arrondi : le serveur et le navigateur doivent produire exactement le même style.
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    size: 5 + (index % 4) * 2,
    color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
    delay: (index % 5) * 0.03,
  };
});

/** Petites particules aux couleurs de la marque, qui jaillissent puis s'effacent. */
function SuccessBurst() {
  return (
    <div className="relative mx-auto mb-6 grid size-24 place-items-center" aria-hidden>
      {PARTICLES.map((particle, index) => (
        <m.span
          key={index}
          className="absolute rounded-full"
          style={{ width: particle.size, height: particle.size, background: particle.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: particle.x, y: particle.y, scale: [0, 1, 0.6], opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.2 + particle.delay }}
        />
      ))}
      <m.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRING, delay: 0.1 }}
        className="relative grid size-24 place-items-center rounded-full bg-emerald text-forest-deep shadow-lift"
      >
        <m.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING, delay: 0.35 }}
        >
          <Check className="size-12" strokeWidth={3} />
        </m.span>
      </m.span>
    </div>
  );
}

export function StepDone({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);

  const summary = [
    displaySiteUrl(siteUrl) + " analysé",
    "Script installé",
    "Stripe connecté en lecture seule",
    "91 % de vos clients reliés à leur provenance",
  ];

  return (
    <m.div
      animate={isLeaving ? { opacity: 0, scale: 1.04, y: -12 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: DURATION.screen, ease: EASE_OUT }}
      onAnimationComplete={() => isLeaving && router.push("/app")}
    >
      <Card className="p-8 text-center sm:p-12">
        <SuccessBurst />
        <h1 className="mb-3 text-[34px] sm:text-[44px]">C&apos;est terminé.</h1>
        <p className="mb-8 text-lg text-slate">Vous n&apos;avez plus rien à configurer.</p>
        <ul className="mx-auto mb-9 max-w-sm space-y-2.5 text-left">
          {summary.map((line, index) => (
            <m.li
              key={line}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.12, duration: DURATION.screen, ease: EASE_OUT }}
              className="flex items-center gap-3 text-[15px] text-ink"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {line}
            </m.li>
          ))}
        </ul>
        <Button size="lg" onClick={() => setIsLeaving(true)} disabled={isLeaving}>
          Voir mon tableau de bord <Icon icon={ArrowRight} anim="nudge" />
        </Button>
        <p className="mt-4 text-[13px] text-slate">
          Vos premières recommandations arrivent sous 24 heures.
        </p>
      </Card>
    </m.div>
  );
}
