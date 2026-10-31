"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleCheck, Info, LoaderCircle } from "lucide-react";
import { Icon } from "@/components/brand/icon";

const REFRESH_MS = 3000;
const MAX_REFRESHES = 10;

/**
 * Retour de la page de paiement Stripe. L'abonnement n'est annoncé « actif » qu'une fois la
 * notification signée de Stripe reçue : en attendant, la page se rafraîchit d'elle-même.
 */
export function PaymentReturn({ result, isPaid }: { result: string | null; isPaid: boolean }) {
  const router = useRouter();
  const [refreshes, setRefreshes] = useState(0);
  const waiting = result === "ok" && !isPaid && refreshes < MAX_REFRESHES;

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      router.refresh();
      setRefreshes((count) => count + 1);
    }, REFRESH_MS);
    return () => clearTimeout(timer);
  }, [waiting, refreshes, router]);

  if (result === "annule") {
    return (
      <p
        role="status"
        className="mb-4 flex items-center gap-2 rounded-2xl bg-cream px-4 py-3 text-sm text-ink"
      >
        <Icon icon={Info} anim="pop" className="size-4 text-slate" /> Paiement annulé : rien
        n&apos;a été prélevé.
      </p>
    );
  }
  if (result !== "ok") return null;
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-tint px-4 py-3 text-sm font-semibold text-forest"
    >
      {isPaid ? (
        <>
          <Icon icon={CircleCheck} anim="pop" className="size-4 text-emerald-ink" /> Merci ! Votre
          abonnement est actif. La facture vous est envoyée par email.
        </>
      ) : waiting ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> Paiement reçu : activation de
          votre abonnement…
        </>
      ) : (
        <>
          <Icon icon={Info} anim="pop" className="size-4" /> La confirmation de Stripe arrive dans
          quelques minutes. Vous pouvez continuer à utiliser SaasClair.
        </>
      )}
    </p>
  );
}
