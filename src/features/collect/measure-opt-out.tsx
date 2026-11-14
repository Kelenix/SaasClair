"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";

// Droit d'opposition à la mesure d'audience de saasclair.com : un clic, gardé dans ce navigateur.
// Le script de collecte (public/s.js) lit « sc_off » avant chaque envoi et n'envoie alors rien.

const KEY = "sc_off";
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const readOff = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Enregistre le choix ; l'identifiant du visiteur est effacé avec le refus. */
function writeOff(off: boolean) {
  try {
    if (off) {
      localStorage.setItem(KEY, "1");
      localStorage.removeItem("sc_vid");
      localStorage.removeItem("sc_vid_t");
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

export function MeasureOptOut() {
  // Côté serveur, le choix est inconnu : bouton inactif jusqu'à l'affichage dans le navigateur.
  const off = useSyncExternalStore<boolean | null>(subscribe, readOff, () => null);

  const toggle = () => {
    const next = !off;
    if (!writeOff(next)) {
      toast.error(
        "Votre navigateur bloque ce réglage. Autorisez le stockage du site, puis réessayez.",
      );
      return;
    }
    toast.success(
      next
        ? "C'est noté : vos visites ne sont plus comptées sur ce navigateur."
        : "Vos visites sont de nouveau comptées.",
    );
  };

  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[15px]" aria-live="polite">
        {off
          ? "Vos visites ne sont plus comptées sur ce navigateur."
          : "Vos visites sont comptées, sans cookie ni adresse IP enregistrée."}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={off === null}
        onClick={toggle}
        data-icon-trigger
      >
        <Icon icon={off ? Eye : EyeOff} anim="pop" />
        {off ? "Les compter à nouveau" : "Ne plus compter mes visites"}
      </Button>
    </div>
  );
}
