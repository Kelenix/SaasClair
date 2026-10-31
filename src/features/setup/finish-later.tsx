"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { skipSetup } from "./actions";

/** En-tête de la configuration : tout remettre à plus tard et aller au tableau de bord. */
export function FinishLater() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      data-icon-trigger
      onClick={() =>
        startTransition(async () => {
          const result = await skipSetup();
          if (result.ok) router.push("/app");
          else toast.error(result.message);
        })
      }
    >
      <Icon icon={Clock} anim="tilt" /> Terminer plus tard
    </Button>
  );
}
