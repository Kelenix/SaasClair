"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { Cookie } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT } from "@/lib/motion";
import type { PublicSettings } from "./queries";

// Consentement aux traceurs publicitaires (RGPD) : rien n'est chargé avant le choix du visiteur.
// Le choix est gardé dans ce navigateur ; « Gérer les cookies » permet d'en changer à tout moment.

type Choice = "accepte" | "refuse" | null;
const KEY = "sc_consentement";
const REOPEN_EVENT = "sc:consentement";

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener(REOPEN_EVENT, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(REOPEN_EVENT, listener);
  };
};
const readChoice = (): Choice => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "accepte" || value === "refuse" ? value : null;
  } catch {
    return null;
  }
};
const writeChoice = (choice: Choice) => {
  try {
    if (choice) localStorage.setItem(KEY, choice);
    else localStorage.removeItem(KEY);
  } catch {
    // Choix non mémorisé : le bandeau reviendra à la prochaine visite.
  }
  listeners.forEach((listener) => listener());
};

type Tracked = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };
  _linkedin_partner_id?: string;
};

function addScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/** Charge les outils branchés dans l'espace administrateur (une seule fois par page). */
function loadTrackers(settings: PublicSettings) {
  const win = window as Tracked;
  const googleIds = [settings.ga4Id, settings.googleAdsId].filter(Boolean) as string[];
  if (googleIds.length && !win.gtag) {
    win.dataLayer = win.dataLayer ?? [];
    win.gtag = function gtag() {
      // gtag attend l'objet « arguments » tel quel.
      // eslint-disable-next-line prefer-rest-params
      win.dataLayer!.push(arguments);
    };
    win.gtag("js", new Date());
    googleIds.forEach((id) => win.gtag!("config", id));
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleIds[0])}`);
  }
  if (settings.metaPixelId && !win.fbq) {
    const fbq = Object.assign(
      (...args: unknown[]) => {
        fbq.queue!.push(args);
      },
      { queue: [] as unknown[], loaded: true, version: "2.0" },
    );
    win.fbq = fbq;
    // Le script officiel lit la file d'attente de « fbq » à son chargement.
    (win as unknown as { _fbq: unknown })._fbq = fbq;
    fbq("init", settings.metaPixelId);
    fbq("track", "PageView");
    addScript("https://connect.facebook.net/fr_FR/fbevents.js");
  }
  if (settings.linkedinPartnerId && !win._linkedin_partner_id) {
    win._linkedin_partner_id = settings.linkedinPartnerId;
    addScript("https://snap.licdn.com/li.lms-analytics/insight.min.js");
  }
}

/** Bouton du pied de page pour revoir son choix. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={`cursor-pointer text-left ${className ?? ""}`}
      onClick={() => writeChoice(null)}
    >
      Gérer les cookies
    </button>
  );
}

/**
 * Bandeau de consentement + chargement des traceurs après accord. Avec `conversion`, signale
 * aussi une inscription réussie (Google Ads, Analytics et Meta).
 */
export function Tracking({
  settings,
  conversion = false,
}: {
  settings: PublicSettings;
  conversion?: boolean;
}) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "refuse" as Choice);

  useEffect(() => {
    if (choice !== "accepte") return;
    loadTrackers(settings);
    if (!conversion) return;
    const win = window as Tracked;
    if (settings.googleAdsId && settings.googleAdsConversionLabel) {
      win.gtag?.("event", "conversion", {
        send_to: `${settings.googleAdsId}/${settings.googleAdsConversionLabel}`,
      });
    }
    if (settings.ga4Id) win.gtag?.("event", "sign_up", { method: "email" });
    win.fbq?.("track", "CompleteRegistration");
  }, [choice, settings, conversion]);

  return (
    <AnimatePresence>
      {choice === null && (
        <m.div
          role="dialog"
          aria-labelledby="consentement-titre"
          aria-describedby="consentement-texte"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: DURATION.screen, ease: EASE_OUT }}
          className="fixed inset-x-4 bottom-4 z-50 rounded-panel border border-line bg-white p-5 shadow-float sm:right-auto sm:left-6 sm:max-w-md"
          data-icon-trigger
        >
          <p
            id="consentement-titre"
            className="mb-1 flex items-center gap-2 font-serif text-lg font-semibold text-forest"
          >
            <Icon icon={Cookie} anim="wiggle" className="size-5 text-gold-ink" /> Mesure et
            publicité
          </p>
          <p id="consentement-texte" className="mb-4 text-sm text-ink">
            Avec votre accord, nous mesurons l&apos;efficacité de nos publicités (Google, Meta,
            LinkedIn). Sans accord, rien n&apos;est chargé et le site fonctionne de la même façon.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => writeChoice("refuse")}>
              Refuser
            </Button>
            <Button size="sm" onClick={() => writeChoice("accepte")}>
              Accepter
            </Button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
