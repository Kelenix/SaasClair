import { CreditCard } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { PlanChooser, PortalButton } from "./plan-chooser";

/**
 * Essai terminé (ou abonnement arrêté) : le tableau de bord laisse place au choix de l'offre.
 * Rien n'est effacé ; tout revient dès le paiement confirmé.
 */
export function Paywall({
  trialEnded,
  hasStripeCustomer,
  preferred = null,
}: {
  trialEnded: boolean;
  hasStripeCustomer: boolean;
  /** Offre choisie sur la page Tarifs avant l'inscription. */
  preferred?: string | null;
}) {
  return (
    <section aria-labelledby="choix-offre" className="mx-auto max-w-5xl">
      <h1 id="choix-offre" className="mb-2 text-[34px] sm:text-[42px]">
        {trialEnded ? "Votre essai est terminé." : "Votre abonnement est arrêté."}
      </h1>
      <p className="mb-8 max-w-2xl text-[17px] text-slate">
        Vos données sont conservées. Choisissez votre offre pour retrouver votre tableau de bord :
        tout revient dès le paiement confirmé.
      </p>
      <PlanChooser preferred={preferred} />
      {hasStripeCustomer && (
        <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate">
          Factures et moyens de paiement : <PortalButton />
        </p>
      )}
    </section>
  );
}

/** Paiement en échec : Stripe retente ; l'accès reste ouvert, avec ce rappel discret. */
export function PastDueBanner() {
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-card border border-gold/40 bg-gold-tint p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <Icon icon={CreditCard} anim="wiggle" className="size-5 shrink-0 text-gold-ink" />
      <p className="flex-1 text-[15px] text-ink">
        Votre dernier paiement a échoué. Stripe va réessayer ; mettez à jour votre moyen de paiement
        pour garder votre accès.
      </p>
      <PortalButton variant="primary" />
    </div>
  );
}
