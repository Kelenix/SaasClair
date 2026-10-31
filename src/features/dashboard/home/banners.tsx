"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, CircleHelp, Wrench } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { displaySiteUrl } from "@/lib/site-url";
import { confirmCheckoutPage } from "../actions";

const BANNER_MOTION = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.micro } },
  transition: { duration: DURATION.screen, ease: EASE_OUT },
};

/**
 * Mode secours (.docx §3.3) : quand l'analyse n'a pas trouvé la page de paiement, on propose
 * la plus probable et l'utilisateur confirme en un clic. Jamais de formulaire de réglages.
 */
export function CheckoutBanner({ siteUrl }: { siteUrl: string }) {
  const inputId = useId();
  const guess = `${siteUrl}/checkout`;
  const [isVisible, setIsVisible] = useState(true);
  const [isChoosing, setIsChoosing] = useState(false);
  const [path, setPath] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirm = (url: string) =>
    startTransition(async () => {
      setIsVisible(false);
      const result = await confirmCheckoutPage(url);
      if (result.ok) toast.success("Merci, c'est noté. Votre tunnel est à jour.");
      else {
        setIsVisible(true);
        toast.error(result.message);
      }
    });

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          {...BANNER_MOTION}
          role="region"
          aria-label="Question en un clic"
          className="mb-6 rounded-card border border-gold/40 bg-gold-tint p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <span className="pulse-soft grid size-10 shrink-0 place-items-center rounded-full bg-white text-gold-ink">
              <Icon icon={CircleHelp} anim="wiggle" />
            </span>
            <p className="flex-1 text-[15px] text-ink">
              Nous n&apos;avons pas trouvé votre page de paiement. Est-ce celle-ci :{" "}
              <strong className="break-all text-forest">{displaySiteUrl(guess)}</strong> ?
            </p>
            {!isChoosing && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => confirm(guess)} disabled={isPending}>
                  Oui
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setIsChoosing(true)}>
                  Choisir une autre page
                </Button>
              </div>
            )}
          </div>
          {isChoosing && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (path.trim()) confirm(path.trim());
              }}
              className="mt-4 flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor={inputId} className="sr-only">
                Adresse de votre page de paiement
              </label>
              <Input
                id={inputId}
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="/paiement"
                className="bg-white"
              />
              <Button type="submit" size="md" disabled={isPending}>
                Enregistrer
              </Button>
            </form>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** Rappel discret quand on explore avec les données de démonstration avant la fin de la configuration. */
export function SetupBanner() {
  return (
    <m.div
      {...BANNER_MOTION}
      className="mb-6 flex flex-col gap-3 rounded-card bg-forest p-4 text-cream sm:flex-row sm:items-center sm:p-5"
    >
      <Icon icon={Wrench} anim="tilt" className="size-5 text-gold" />
      <p className="flex-1 text-[15px]">
        Vous explorez des données de démonstration. Terminez la configuration pour voir les vôtres :
        2 actions, moins de 5 minutes.
      </p>
      <Button asChild variant="positive" size="sm">
        <Link href="/configuration">
          Terminer <Icon icon={ArrowRight} anim="nudge" />
        </Link>
      </Button>
    </m.div>
  );
}
