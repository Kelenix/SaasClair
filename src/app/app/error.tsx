"use client";

import { WifiOff } from "lucide-react";
import { StateMessage } from "@/components/states/state-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Erreur de chargement d'un écran : message clair, données intactes, bouton pour réessayer.
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <StateMessage
        tone="error"
        icon={WifiOff}
        anim="wiggle"
        title="Cet écran n'a pas pu se charger."
        description="Vos données sont intactes. Réessayez dans un instant ; si le problème continue, nous sommes déjà prévenus."
        action={
          <Button variant="secondary" onClick={reset}>
            Réessayer
          </Button>
        }
      />
    </Card>
  );
}
