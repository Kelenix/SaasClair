"use client";

import { createContext, use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PERIOD_COOKIE, type Period } from "./period";

const ONE_YEAR_SECONDS = 31_536_000;

type PeriodContextValue = {
  period: Period;
  isPending: boolean;
  setPeriod: (period: Period) => void;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

/**
 * Période globale : le sélecteur bouge tout de suite (interface optimiste), puis tout l'écran
 * se recalcule côté serveur. Mémorisée dans un cookie pour suivre l'utilisateur d'écran en écran.
 */
export function PeriodProvider({
  initial,
  children,
}: {
  initial: Period;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [period, setPeriodState] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const setPeriod = (next: Period) => {
    setPeriodState(next);
    document.cookie = `${PERIOD_COOKIE}=${next}; path=/app; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return <PeriodContext value={{ period, isPending, setPeriod }}>{children}</PeriodContext>;
}

export function usePeriod() {
  const context = use(PeriodContext);
  if (!context) throw new Error("usePeriod doit être utilisé dans PeriodProvider");
  return context;
}

/** Contenu de page : s'estompe légèrement pendant le recalcul, sans jamais disparaître. */
export function PeriodContent({ children }: { children: React.ReactNode }) {
  const { isPending } = usePeriod();
  return (
    <div aria-busy={isPending} className="transition-opacity duration-300 aria-busy:opacity-55">
      {children}
    </div>
  );
}
