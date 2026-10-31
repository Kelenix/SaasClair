"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { CalendarClock, Copy, Mail, MailPlus, Siren, Users } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { RiskMeter } from "@/components/data/risk-meter";
import { Sparkline } from "@/components/data/sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatEuro } from "@/lib/format";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { draftEmail } from "../customers";
import type { WatchedRow } from "./data";

function agoLabel(days: number) {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 60) return `il y a ${days} jours`;
  return `il y a ${Math.round(days / 30)} mois`;
}

const TIMELINE_DOT = {
  neutral: "bg-slate/50",
  warning: "bg-gold",
  positive: "bg-emerald",
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 eyebrow">{title}</h3>
      {children}
    </section>
  );
}

// Le brouillon apparaît sous la chronologie : on l'amène à l'écran (fonction stable, appelée une fois).
const revealDraft = (node: HTMLDivElement | null) =>
  node?.scrollIntoView({ behavior: "smooth", block: "nearest" });

/** Brouillon de relance modifiable : l'utilisateur le relit, puis le copie ou l'ouvre dans sa messagerie. */
function EmailDraft({ customer, sender }: { customer: WatchedRow; sender: string }) {
  const initial = draftEmail(customer, sender);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const fieldClass =
    "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast.success("Email copié. Collez-le dans votre messagerie.");
    } catch {
      toast.error("La copie n'a pas fonctionné. Sélectionnez le texte pour le copier.");
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.screen, ease: EASE_OUT }}
      className="scroll-mb-6 rounded-2xl border border-line bg-cream p-4"
      ref={revealDraft}
    >
      <p className="mb-3 text-sm text-slate">
        Pour {customer.contact.firstName}, {customer.contact.role.toLowerCase()}. Relisez, ajustez,
        puis envoyez-le depuis votre messagerie.
      </p>
      <label className="mb-1 block text-xs font-semibold text-slate" htmlFor="relance-objet">
        Objet
      </label>
      <input
        id="relance-objet"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        className={cn(fieldClass, "mb-3 h-11")}
      />
      <label className="mb-1 block text-xs font-semibold text-slate" htmlFor="relance-message">
        Message
      </label>
      <textarea
        id="relance-message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={9}
        className={cn(fieldClass, "py-3 leading-relaxed")}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          <Icon icon={Copy} anim="pop" /> Copier l&apos;email
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          >
            <Icon icon={Mail} anim="nudge" /> Ouvrir ma messagerie
          </a>
        </Button>
      </div>
    </m.div>
  );
}

/** Panneau latéral d'un client : risque, signaux, usage, chronologie et email de relance. */
export function CustomerSheet({
  customer,
  open,
  onOpenChange,
  sender,
}: {
  customer: WatchedRow | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sender: string;
}) {
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const isDrafting = customer !== undefined && draftFor === customer.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {customer && (
          <>
            <SheetHeader>
              <div className="mb-2 flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream text-sm font-bold text-forest">
                  {customer.initials}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{customer.name}</SheetTitle>
                  <SheetDescription>
                    {customer.plan} · client depuis {customer.since}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{formatEuro(customer.mrr)} / mois</Badge>
                <Badge
                  tone={customer.isHighRisk ? "attention" : "neutral"}
                  pulse={customer.isHighRisk}
                >
                  {customer.isHighRisk ? "Risque élevé" : "Premiers signes"}
                </Badge>
              </div>
            </SheetHeader>

            <SheetBody className="space-y-7 pb-2">
              <Section title="Risque de départ">
                <div className="flex items-center gap-3">
                  <RiskMeter score={customer.score} className="h-2.5 flex-1" />
                  <span className="text-sm font-semibold text-forest tabular-nums">
                    {customer.score} / 100
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm text-ink">
                  <Icon icon={CalendarClock} anim="tilt" className="size-4 text-slate" />
                  Renouvellement le {customer.renewalDate}, dans {customer.renewsInDays} jours.
                </p>
              </Section>

              <Section title="Signaux d'alerte">
                <ul className="space-y-3">
                  {customer.signals.map((signal) => (
                    <li key={signal.label} className="flex gap-3">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gold-tint text-gold-ink">
                        <Icon icon={Siren} anim="wiggle" className="size-3.5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{signal.label}</span>
                        <span className="block text-[13px] text-slate">{signal.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Historique d'usage">
                <Sparkline
                  data={customer.usage}
                  tone={customer.isHighRisk ? "gold" : "emerald"}
                  label={`Connexions par semaine de ${customer.name} sur 12 semaines`}
                  className="h-14"
                />
                <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-slate">
                  <span>Connexions par semaine, sur 12 semaines</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Icon icon={Users} className="size-3.5" />
                    {customer.seats.active} utilisateurs actifs sur {customer.seats.total}
                  </span>
                </p>
              </Section>

              <Section title="Chronologie">
                <ol className="relative space-y-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-line">
                  {customer.timeline.map((event) => (
                    <li key={event.label + event.daysAgo} className="relative flex gap-3 pl-6">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-white",
                          TIMELINE_DOT[event.tone],
                        )}
                      />
                      <span>
                        <span className="block text-sm text-ink">{event.label}</span>
                        <span className="block text-xs text-slate">{agoLabel(event.daysAgo)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>

              <AnimatePresence initial={false}>
                {isDrafting && <EmailDraft key={customer.id} customer={customer} sender={sender} />}
              </AnimatePresence>
            </SheetBody>

            <SheetFooter className="border-t border-line">
              <p className="text-sm text-slate">
                Action suggérée : <strong className="text-forest">{customer.action}</strong>
              </p>
              {!isDrafting && (
                <Button onClick={() => setDraftFor(customer.id)}>
                  <Icon icon={MailPlus} anim="pop" /> Préparer un email de relance
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
