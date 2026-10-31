"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Mail, Radio } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DURATION, EASE_OUT, SPRING } from "@/lib/motion";
import { displaySiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { markScriptDetected } from "./actions";
import { developerEmail, PLATFORMS } from "./platforms";
import { scriptSnippet } from "./steps";

// Démonstration : sans collecte réelle, la « première visite » est simulée peu après la copie.
const SIMULATED_DETECTION_MS = 5000;
const ADVANCE_AFTER_SUCCESS_MS = 1800;
/** Détection réelle : la configuration demande au serveur si la première visite est arrivée. */
const STATUS_POLL_MS = 4000;
const COPIED_FEEDBACK_MS = 2500;

export function CopyBlock({ snippet, onCopied }: { snippet: string; onCopied: () => void }) {
  const [isCopied, setIsCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setIsCopied(true);
      toast.success("Ligne copiée. Collez-la dans votre site.");
      onCopied();
      setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      toast.error("La copie n'a pas fonctionné. Sélectionnez la ligne et copiez-la à la main.");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-forest-deep">
      <code className="block px-5 pt-4 pb-3 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap text-cream/90 select-all">
        {snippet}
      </code>
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <span className="pl-2 text-xs text-cream/75">Moins de 5 Ko · chargé en différé</span>
        <Button
          variant={isCopied ? "positive" : "inverse"}
          size="sm"
          onClick={copy}
          aria-live="polite"
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={String(isCopied)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: DURATION.micro }}
              className="flex items-center gap-2"
            >
              <Icon icon={isCopied ? Check : Copy} />
              {isCopied ? "Copié !" : "Copier"}
            </m.span>
          </AnimatePresence>
        </Button>
      </div>
    </div>
  );
}

function SendToDeveloper({ siteUrl, snippet }: { siteUrl: string; snippet: string }) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const { subject, body } = developerEmail(displaySiteUrl(siteUrl), snippet);
  const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto min-h-11 shrink text-left whitespace-normal">
          <Icon icon={Mail} anim="bounce" /> Envoyer les instructions à mon développeur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer à votre développeur</DialogTitle>
          <DialogDescription>
            Votre messagerie s&apos;ouvre avec un email prêt : la ligne à installer et où la coller.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={inputId} className="text-sm font-semibold">
          Email de votre développeur
        </label>
        <Input
          id={inputId}
          type="email"
          placeholder="dev@monsaas.fr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <DialogFooter>
          <Button asChild>
            <a href={href}>Préparer l&apos;email</a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LiveCheck({ isDetected }: { isDetected: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4 transition-colors duration-500",
        isDetected ? "border-emerald/40 bg-emerald-tint" : "border-line bg-cream",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDetected ? (
          <m.span
            key="ok"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={SPRING}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald text-forest-deep"
          >
            <Check className="size-6" strokeWidth={3} aria-hidden />
          </m.span>
        ) : (
          <m.span
            key="wait"
            exit={{ scale: 0 }}
            className="pulse-ring grid size-11 shrink-0 place-items-center rounded-full bg-gold-tint text-gold"
          >
            <Icon icon={Radio} anim="pop" className="size-5 text-gold-ink" />
          </m.span>
        )}
      </AnimatePresence>
      <div>
        <p className="font-semibold text-ink">
          {isDetected
            ? "Script détecté. Première visite reçue."
            : "En attente des premières visites…"}
        </p>
        <p className="text-[13px] text-slate">
          {isDetected
            ? "Tout fonctionne. On passe à Stripe."
            : "Cette page se met à jour toute seule dès que le script est installé."}
        </p>
      </div>
    </div>
  );
}

type StepScriptProps = {
  siteKey: string;
  siteUrl: string;
  demo: boolean;
  onBack: () => void;
  onDone: () => void;
};

export function StepScript({ siteKey, siteUrl, demo, onBack, onDone }: StepScriptProps) {
  const snippet = scriptSnippet(siteKey);
  const [hasCopied, setHasCopied] = useState(false);
  const [isDetected, setIsDetected] = useState(false);
  const advance = useEffectEvent(onDone);

  // Hors données d'exemple, rien n'est simulé : l'étape attend une vraie première visite.
  useEffect(() => {
    if (!demo || !hasCopied || isDetected) return;
    const timer = setTimeout(async () => {
      const result = await markScriptDetected();
      if (result.ok) setIsDetected(true);
      else toast.error(result.message);
    }, SIMULATED_DETECTION_MS);
    return () => clearTimeout(timer);
  }, [demo, hasCopied, isDetected]);

  useEffect(() => {
    if (isDetected) return;
    const timer = setInterval(async () => {
      const response = await fetch("/api/script-status", { cache: "no-store" }).catch(() => null);
      const status = (await response?.json().catch(() => null)) as { detected?: boolean } | null;
      if (status?.detected) setIsDetected(true);
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [isDetected]);

  useEffect(() => {
    if (!isDetected) return;
    const timer = setTimeout(advance, ADVANCE_AFTER_SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [isDetected]);

  return (
    <Card className="p-6 sm:p-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md text-sm text-slate hover:text-forest"
      >
        <Icon icon={ArrowLeft} anim="nudge" className="size-4" /> {displaySiteUrl(siteUrl)}
      </button>
      <p className="eyebrow">Action 1 · environ 2 minutes</p>
      <h1 className="mb-2 text-[30px] sm:text-[38px]">Installez le script.</h1>
      <p className="mb-6 text-[15px] text-slate">
        Une seule ligne. Elle voit d&apos;où viennent vos visiteurs, sans rien régler.
      </p>

      <Tabs defaultValue="html">
        <TabsList aria-label="Votre plateforme" className="max-w-full">
          {PLATFORMS.map((platform) => (
            <TabsTrigger key={platform.id} value={platform.id}>
              {platform.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PLATFORMS.map((platform) => (
          <TabsContent key={platform.id} value={platform.id} className="space-y-4">
            <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {platform.steps.map((step, index) => (
                <m.li
                  key={step.text}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: DURATION.screen, ease: EASE_OUT }}
                  className="flex gap-3 rounded-2xl bg-cream p-3.5 text-[13px] text-ink sm:flex-col"
                  data-icon-trigger
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-ink shadow-card">
                    <Icon icon={step.icon} anim="pop" className="size-4.5" />
                  </span>
                  <span>
                    <span className="mr-1 font-semibold text-forest">{index + 1}.</span>
                    {step.text}
                  </span>
                </m.li>
              ))}
            </ol>
            {platform.showsSnippet ? (
              <CopyBlock snippet={snippet} onCopied={() => setHasCopied(true)} />
            ) : (
              <CopyBlock snippet={siteKey} onCopied={() => setHasCopied(true)} />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-2 mb-5">
        <SendToDeveloper siteUrl={siteUrl} snippet={snippet} />
      </div>

      <LiveCheck isDetected={isDetected} />
      <p className="mt-3 text-xs text-slate">
        {demo
          ? "Démonstration : la première visite est simulée quelques secondes après la copie."
          : "Une fois la ligne en place, ouvrez votre site dans un autre onglet : la première visite s'affiche ici en quelques secondes."}
      </p>
    </Card>
  );
}
