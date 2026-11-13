"use client";

import { useId, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  CircleHelp,
  Code,
  CreditCard,
  Globe,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { displaySiteUrl } from "@/lib/site-url";
import type { ActionStep } from "@/features/setup/steps";
import { confirmKeyPage, type KeyPageKind } from "../actions";

const BANNER_MOTION = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.micro } },
  transition: { duration: DURATION.screen, ease: EASE_OUT },
};

const KEY_PAGE_LABELS: Record<KeyPageKind, { name: string; placeholder: string }> = {
  checkout: { name: "votre page de paiement", placeholder: "/paiement" },
  signup: { name: "votre page d'inscription", placeholder: "/inscription" },
  pricing: { name: "votre page de tarifs", placeholder: "/tarifs" },
};

/**
 * Mode secours (.docx §3.3) : quand l'analyse n'a pas trouvé une page clé, on propose la plus
 * probable (la plus visitée qui lui ressemble) et l'utilisateur confirme en un clic. Sans
 * proposition, un seul champ. Jamais de formulaire de réglages.
 */
export function KeyPageBanner({
  kind,
  siteUrl,
  guess,
}: {
  kind: KeyPageKind;
  siteUrl: string;
  /** Adresse proposée ; null = on demande directement. */
  guess: string | null;
}) {
  const inputId = useId();
  const { name, placeholder } = KEY_PAGE_LABELS[kind];
  const [isVisible, setIsVisible] = useState(true);
  const [isChoosing, setIsChoosing] = useState(!guess);
  const [path, setPath] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirm = (url: string) =>
    startTransition(async () => {
      setIsVisible(false);
      const result = await confirmKeyPage(kind, url);
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
              Nous n&apos;avons pas trouvé {name}.{" "}
              {guess ? (
                <>
                  Est-ce celle-ci :{" "}
                  <strong className="break-all text-forest">
                    {displaySiteUrl(new URL(guess, siteUrl).toString())}
                  </strong>{" "}
                  ?
                </>
              ) : (
                "Quelle est son adresse ?"
              )}
            </p>
            {!isChoosing && guess && (
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
                Adresse de {name}
              </label>
              <Input
                id={inputId}
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder={placeholder}
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

const SETUP_LINKS: Record<ActionStep, { label: string; duration: string; icon: LucideIcon }> = {
  site: { label: "Adresse de votre SaaS", duration: "30 secondes", icon: Globe },
  script: { label: "Installer le script", duration: "2 minutes", icon: Code },
  stripe: { label: "Connecter Stripe", duration: "1 minute", icon: CreditCard },
};

/**
 * Configuration passée ou pas terminée : ce qui reste, chaque étape à un clic. Tant qu'elle
 * n'est pas finie, les chiffres affichés sont un exemple (le SaaS de Nadia).
 * Liens <a> (vrai chargement) : Next.js garde sinon le parcours de la visite précédente, figé
 * à l'étape où on l'avait quitté, au lieu d'ouvrir l'étape demandée.
 */
export function SetupBanner({ remaining, demo }: { remaining: ActionStep[]; demo: boolean }) {
  const count = remaining.length;
  return (
    <m.section
      {...BANNER_MOTION}
      aria-label="Configuration à terminer"
      className="mb-6 rounded-card bg-forest p-4 text-cream sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Icon icon={Wrench} anim="tilt" className="size-5 shrink-0 text-gold" />
        <p className="flex-1 text-[15px]">
          <strong className="font-semibold">
            Plus {count > 1 ? `que ${count} étapes` : "qu'une étape"} pour voir vos propres
            chiffres.
          </strong>{" "}
          {demo && "En attendant, le tableau de bord affiche un exemple."}
        </p>
        <Button asChild variant="positive" size="sm" className="self-start sm:self-auto">
          <a href={`/configuration?etape=${remaining[0]}`}>
            Continuer <Icon icon={ArrowRight} anim="nudge" />
          </a>
        </Button>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {remaining.map((step) => {
          const { label, duration, icon } = SETUP_LINKS[step];
          return (
            <li key={step}>
              <a
                href={`/configuration?etape=${step}`}
                data-icon-trigger
                className="flex min-h-11 items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-sm transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <Icon icon={icon} anim="pop" className="size-4 shrink-0 text-emerald" />
                <span className="flex-1 font-semibold">{label}</span>
                <span className="text-[13px]">{duration}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </m.section>
  );
}

/** Page de paiement : proposition par défaut « /checkout » (accueil, données d'exemple). */
export function CheckoutBanner({ siteUrl }: { siteUrl: string }) {
  return <KeyPageBanner kind="checkout" siteUrl={siteUrl} guess={`${siteUrl}/checkout`} />;
}
