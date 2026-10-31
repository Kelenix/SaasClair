"use client";

import { useActionState, useId } from "react";
import { AnimatePresence, m } from "motion/react";
import { Check, Send } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { subscribeToNewsletter, type NewsletterState } from "./newsletter-actions";

/** Inscription à la newsletter, dans le pied de page (fond vert forêt). */
export function NewsletterForm({ source = "pied-de-page" }: { source?: string }) {
  const id = useId();
  const [state, action, isPending] = useActionState<NewsletterState, FormData>(
    subscribeToNewsletter,
    {},
  );

  return (
    <div className="max-w-sm">
      <p className="mb-1 font-semibold text-cream">Nos conseils pour garder vos clients</p>
      <p className="mb-3 text-[13px]">
        Chiffres, méthodes et nouveautés. Désinscription en un clic.
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {state.status === "success" ? (
          <m.p
            key="merci"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.screen, ease: EASE_OUT }}
            role="status"
            className="flex items-center gap-2 rounded-xl bg-white/8 px-3.5 py-3 text-cream"
          >
            <Icon icon={Check} anim="pop" className="size-4 text-emerald" />
            {state.message}
          </m.p>
        ) : (
          <m.form key="formulaire" action={action} exit={{ opacity: 0 }} noValidate>
            <label htmlFor={id} className="sr-only">
              Votre email
            </label>
            {/* Piège à robots : invisible pour les personnes. */}
            <input
              type="text"
              name="site"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
            />
            <input type="hidden" name="source" value={source} />
            <div className="flex gap-2">
              <input
                id={id}
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@entreprise.fr"
                aria-invalid={state.status === "error"}
                aria-describedby={state.status === "error" ? `${id}-erreur` : undefined}
                className="h-11 min-w-0 flex-1 rounded-full border border-cream/20 bg-white/8 px-4 text-[15px] text-cream outline-none placeholder:text-cream/70 focus-visible:border-emerald focus-visible:ring-4 focus-visible:ring-emerald/25"
              />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-emerald px-4 text-sm font-semibold text-forest-deep transition-[translate,scale] outline-none hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald active:scale-[0.97] disabled:opacity-60"
              >
                <Icon icon={Send} anim="nudge" className="size-4" />
                {isPending ? "Envoi…" : "S'inscrire"}
              </button>
            </div>
            {state.status === "error" && (
              <p id={`${id}-erreur`} role="alert" className="mt-2 text-[13px] text-gold">
                {state.message}
              </p>
            )}
          </m.form>
        )}
      </AnimatePresence>
    </div>
  );
}
