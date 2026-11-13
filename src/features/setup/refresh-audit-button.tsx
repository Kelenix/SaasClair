"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { refreshSiteAudit } from "./actions";

/**
 * « Analyser maintenant » : après une correction sur le site (titre, description…), le
 * tableau de bord relit la page d'accueil tout de suite. Sinon, elle est relue seule toutes
 * les 6 heures.
 */
export function RefreshAuditButton({ ageLabel }: { ageLabel: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      const result = await refreshSiteAudit();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.data.tooSoon
          ? "Votre site vient d'être analysé. Réessayez dans quelques secondes."
          : `Analyse à jour : référencement ${result.data.score} / 100.`,
      );
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-sm text-slate" aria-live="polite">
        {isPending ? "Analyse en cours…" : `Analysé ${ageLabel}. Mis à jour seul toutes les 6 h.`}
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={refresh}
        disabled={isPending}
        data-icon-trigger
      >
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Icon icon={RefreshCw} anim="spin" className="size-4" />
        )}
        Analyser maintenant
      </Button>
    </div>
  );
}
