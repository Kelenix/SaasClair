"use client";

import { useEffect, useEffectEvent, useId, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  ArrowRight,
  Check,
  CircleDashed,
  Gauge,
  Globe,
  LoaderCircle,
  Search,
  Layers,
} from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GrowBar } from "@/components/data/grow-bar";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { displaySiteUrl, normalizeSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { analyzeSite } from "./actions";
import type { SiteAudit } from "./site-analysis";

const REVEAL_INTERVAL_MS = 350;

type Result = { siteUrl: string; siteKey: string; audit: SiteAudit };

function checklist(audit: SiteAudit) {
  return [
    {
      ok: audit.pageCount > 0,
      label:
        audit.pageCount > 0
          ? `${audit.pageCount} pages détectées`
          : "Pages : découvertes à la première visite",
    },
    {
      ok: Boolean(audit.pages.signup),
      label: audit.pages.signup
        ? "Page d'inscription trouvée"
        : "Page d'inscription : à confirmer plus tard",
    },
    {
      ok: Boolean(audit.pages.pricing),
      label: audit.pages.pricing
        ? "Page de tarifs trouvée"
        : "Page de tarifs : à confirmer plus tard",
    },
    {
      ok: Boolean(audit.pages.checkout),
      label: audit.pages.checkout
        ? "Page de paiement trouvée"
        : "Page de paiement : à confirmer plus tard",
    },
  ];
}

const PENDING_LABELS = [
  "Pages du site",
  "Page d'inscription",
  "Page de tarifs",
  "Page de paiement",
];

const SPEED_LABEL = { rapide: "Rapide", correct: "Correcte", lent: "Lente" } as const;

/** Vignette du site, parcourue par une ligne lumineuse pendant l'analyse. */
function SiteThumbnail({
  siteUrl,
  isScanning,
  title,
}: {
  siteUrl: string;
  isScanning: boolean;
  title?: string | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-card"
      aria-hidden
    >
      <div className="flex h-8 items-center gap-1.5 border-b border-line bg-paper px-3">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-2 rounded-full bg-line" />
        ))}
        <span className="mx-auto truncate rounded-full bg-white px-3 py-0.5 text-[10px] text-slate">
          {displaySiteUrl(siteUrl)}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex justify-between">
          <span className="h-2.5 w-14 rounded-full bg-sand" />
          <span className="flex gap-2">
            <span className="h-2.5 w-8 rounded-full bg-sand" />
            <span className="h-2.5 w-8 rounded-full bg-sand" />
            <span className="h-2.5 w-12 rounded-full bg-forest/20" />
          </span>
        </div>
        <p className="pt-2 font-serif text-sm font-semibold text-forest">
          {title ?? <span className="block h-3.5 w-3/4 rounded-full bg-sand" />}
        </p>
        <span className="block h-2 w-2/3 rounded-full bg-sand" />
        <span className="block h-6 w-24 rounded-full bg-forest/15" />
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[0, 1, 2].map((card) => (
            <span key={card} className="h-10 rounded-lg bg-cream" />
          ))}
        </div>
      </div>
      {isScanning && (
        <span className="absolute inset-x-0 top-0 h-16 animate-[scan_1.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-emerald/25 to-transparent motion-reduce:animate-pulse">
          <span className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald shadow-[0_0_12px_2px] shadow-emerald/60" />
        </span>
      )}
    </div>
  );
}

function AuditTiles({ audit }: { audit: SiteAudit }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.screen, ease: EASE_OUT }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <div className="rounded-2xl bg-cream p-4" data-icon-trigger>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate">
          <Icon icon={Gauge} anim="tilt" className="size-4" /> Vitesse
        </p>
        <p className="font-serif text-xl font-semibold text-forest">
          {audit.speed ? SPEED_LABEL[audit.speed] : "—"}
        </p>
        {audit.responseMs !== null && (
          <p className="text-xs text-slate">Réponse en {audit.responseMs} ms</p>
        )}
      </div>
      <div className="rounded-2xl bg-cream p-4" data-icon-trigger>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate">
          <Icon icon={Search} anim="tilt" className="size-4" /> Référencement
        </p>
        <p className="mb-2 font-serif text-xl font-semibold text-forest">{audit.seo.score} / 100</p>
        <GrowBar share={audit.seo.score} tone={audit.seo.score >= 70 ? "emerald" : "gold"} />
      </div>
      <div className="rounded-2xl bg-cream p-4" data-icon-trigger>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate">
          <Icon icon={Layers} anim="bounce" className="size-4" /> Technologies
        </p>
        <div className="flex flex-wrap gap-1.5">
          {audit.technologies.length ? (
            audit.technologies.map((name) => (
              <Badge key={name} className="text-[11px]">
                {name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate">Aucune reconnue</span>
          )}
        </div>
      </div>
    </m.div>
  );
}

type StepSiteProps = {
  firstName: string;
  defaultSite: string;
  previousAudit: SiteAudit | null;
  onDone: (result: Result) => void;
};

export function StepSite({ firstName, defaultSite, previousAudit, onDone }: StepSiteProps) {
  const inputId = useId();
  const [value, setValue] = useState(defaultSite ? displaySiteUrl(defaultSite) : "");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [revealed, setRevealed] = useState(previousAudit ? PENDING_LABELS.length : 0);
  const [isPending, startTransition] = useTransition();
  const audit = result?.audit ?? previousAudit;
  const isScanning = isPending || (Boolean(result) && revealed < PENDING_LABELS.length);
  const isFinished = Boolean(audit) && !isScanning;
  const scannedSite = normalizeSiteUrl(value) ?? defaultSite;

  // Une fois l'analyse reçue, les vérifications se cochent une à une.
  useEffect(() => {
    if (!result || revealed >= PENDING_LABELS.length) return;
    const timer = setTimeout(() => setRevealed((count) => count + 1), REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [result, revealed]);

  function launch(site: string) {
    startTransition(async () => {
      const response = await analyzeSite(site);
      if (response.ok) setResult(response.data);
      else setError(response.message);
    });
  }

  function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!normalizeSiteUrl(value)) {
      setError("Entrez l'adresse de votre site, par exemple monsaas.fr.");
      return;
    }
    setError(null);
    setResult(null);
    setRevealed(0);
    launch(value);
  }

  // Adresse déjà saisie sur le site vitrine : l'analyse démarre seule, sans clic de plus (l'état
  // est déjà celui de départ, il n'y a rien à remettre à zéro).
  const autoStart = useEffectEvent(() => launch(defaultSite));
  useEffect(() => {
    if (defaultSite && !previousAudit) autoStart();
  }, [defaultSite, previousAudit]);

  const items = audit ? checklist(audit) : null;
  const hasStarted = isPending || Boolean(audit);

  return (
    <Card className="p-6 sm:p-10">
      <p className="eyebrow">Votre SaaS</p>
      <h1 className="mb-2 text-[30px] sm:text-[38px]">
        {firstName ? `${firstName}, quelle` : "Quelle"} est l&apos;adresse de votre SaaS ?
      </h1>
      <p className="mb-6 text-[15px] text-slate">
        Nous l&apos;analysons tout de suite : pages clés, vitesse, référencement.
      </p>

      <form onSubmit={analyze} noValidate className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Adresse de votre SaaS
        </label>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate">
            <Icon icon={Globe} anim="spin" className="size-5" />
          </span>
          <Input
            id={inputId}
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="monsaas.fr"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="pl-12"
          />
        </div>
        <Button type="submit" variant={audit ? "secondary" : "primary"} disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="size-5 animate-spin" aria-hidden />
              <span className="sr-only">Analyse en cours…</span>
            </>
          ) : audit ? (
            "Relancer"
          ) : (
            "Analyser"
          )}
        </Button>
      </form>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <AnimatePresence>
        {hasStarted && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: DURATION.screen, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-5 pt-7 sm:grid-cols-[1fr_1.1fr] sm:items-center">
              <SiteThumbnail
                siteUrl={scannedSite}
                isScanning={isScanning}
                title={isFinished ? audit?.seo.title : null}
              />
              <ul className="space-y-2.5" aria-label="Vérifications">
                {PENDING_LABELS.map((pendingLabel, index) => {
                  const item = items && index < revealed ? items[index] : null;
                  return (
                    <li key={pendingLabel} className="flex items-center gap-3 text-sm">
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full",
                          !item
                            ? "bg-sand text-slate"
                            : item.ok
                              ? "bg-emerald text-forest-deep"
                              : "bg-gold-tint text-gold-ink",
                        )}
                      >
                        {item ? (
                          <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING}>
                            {item.ok ? (
                              <Check className="size-3.5" strokeWidth={3} aria-hidden />
                            ) : (
                              <CircleDashed className="size-3.5" aria-hidden />
                            )}
                          </m.span>
                        ) : (
                          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                        )}
                      </span>
                      <span className={item ? "text-ink" : "text-slate"}>
                        {item?.label ?? `${pendingLabel}…`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {isFinished && audit && (
              <div className="mt-6 space-y-5">
                {!audit.reachable && (
                  <p className="rounded-xl bg-gold-tint px-4 py-3 text-sm text-gold-ink">
                    Nous n&apos;avons pas pu ouvrir votre site pour l&apos;instant. Pas
                    d&apos;inquiétude : nous l&apos;analyserons dès la première visite reçue.
                  </p>
                )}
                {audit.reachable && <AuditTiles audit={audit} />}
                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const data = result ?? { siteUrl: defaultSite, siteKey: "", audit };
                    onDone(data);
                  }}
                >
                  Continuer <Icon icon={ArrowRight} anim="nudge" />
                </Button>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
