"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { CalendarClock, ChevronRight, Copy, HeartPulse, Mail, MailPlus, Siren } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { RiskMeter } from "@/components/data/risk-meter";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { DURATION, EASE_OUT, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AtRisk } from "./metrics";

const dayMonth = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;
const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

const TIMELINE_DOT = {
  neutral: "bg-slate/50",
  warning: "bg-gold",
  positive: "bg-emerald",
} as const;

/** Brouillon de relance : accroche tirée de la raison du risque, relu puis envoyé par l'utilisateur. */
export function draftRetentionEmail(customer: AtRisk, sender: string) {
  return {
    subject: "Un point rapide sur votre abonnement ?",
    body: [
      "Bonjour,",
      customer.hook,
      "Seriez-vous disponible pour un échange de 15 minutes cette semaine ? Je m'adapte à votre agenda.",
      `Bonne journée,\n${sender || "L'équipe"}`,
    ].join("\n\n"),
  };
}

function EmailDraft({ customer, sender }: { customer: AtRisk; sender: string }) {
  const initial = draftRetentionEmail(customer, sender);
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
      ref={(node) => node?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
    >
      <p className="mb-3 text-sm text-slate">
        {customer.email ? `Pour ${customer.email}. ` : ""}Relisez, ajustez, puis envoyez-le depuis
        votre messagerie.
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
            href={`mailto:${encodeURIComponent(customer.email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
          >
            <Icon icon={Mail} anim="nudge" /> Ouvrir ma messagerie
          </a>
        </Button>
      </div>
    </m.div>
  );
}

/** Fiche d'un client à risque : raisons, échéance, chronologie Stripe et email de relance. */
function CustomerSheet({
  customer,
  onClose,
  sender,
}: {
  customer: AtRisk | undefined;
  onClose: () => void;
  sender: string;
}) {
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const isDrafting = customer !== undefined && draftFor === customer.customerId;
  return (
    <Sheet open={customer !== undefined} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {customer && (
          <>
            <SheetHeader>
              <div className="mb-2 flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cream text-sm font-bold text-forest">
                  {initials(customer.name)}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{customer.name}</SheetTitle>
                  <SheetDescription>
                    {[customer.plan, customer.since && `client depuis ${monthYear(customer.since)}`]
                      .filter(Boolean)
                      .join(" · ") || "Client Stripe"}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{formatEuro(customer.mrr)} / mois</Badge>
                <Badge
                  tone={customer.level === "retain" ? "attention" : "neutral"}
                  pulse={customer.level === "retain"}
                >
                  {customer.level === "retain" ? "À retenir" : "À surveiller"}
                </Badge>
              </div>
            </SheetHeader>

            <SheetBody className="space-y-7 pb-2">
              <section>
                <h3 className="mb-3 eyebrow">Priorité</h3>
                <div className="flex items-center gap-3">
                  <RiskMeter score={customer.score} className="h-2.5 flex-1" />
                  <span className="text-sm font-semibold text-forest tabular-nums">
                    {customer.score} / 100
                  </span>
                </div>
                {customer.periodEnd && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-ink" data-icon-trigger>
                    <Icon icon={CalendarClock} anim="tilt" className="size-4 text-slate" />
                    Échéance le {dayMonth(customer.periodEnd)}.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-3 eyebrow">Signaux d&apos;alerte</h3>
                <ul className="space-y-3">
                  {customer.reasons.map((reason) => (
                    <li key={reason.kind} className="flex items-center gap-3" data-icon-trigger>
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-tint text-gold-ink">
                        <Icon icon={Siren} anim="wiggle" className="size-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-ink">{reason.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {customer.timeline.length > 0 && (
                <section>
                  <h3 className="mb-3 eyebrow">Chronologie</h3>
                  <ol className="relative space-y-4 before:absolute before:top-1.5 before:bottom-1.5 before:left-[5px] before:w-px before:bg-line">
                    {customer.timeline.map((event) => (
                      <li key={event.label + event.date} className="relative flex gap-3 pl-6">
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-white",
                            TIMELINE_DOT[event.tone],
                          )}
                        />
                        <span>
                          <span className="block text-sm text-ink">{event.label}</span>
                          <span className="block text-xs text-slate">{dayMonth(event.date)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <AnimatePresence initial={false}>
                {isDrafting && (
                  <EmailDraft key={customer.customerId} customer={customer} sender={sender} />
                )}
              </AnimatePresence>
            </SheetBody>

            <SheetFooter className="border-t border-line">
              {!isDrafting && (
                <Button onClick={() => setDraftFor(customer.customerId)}>
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

/**
 * Clients à risque : vraies raisons tirées de Stripe. Le score additionne les points de chaque
 * raison : c'est une priorité, pas une probabilité. Sur l'écran Churn, chaque client ouvre sa
 * fiche ; ailleurs (accueil), il y mène.
 */
export function RiskList({
  customers,
  limit,
  sender = "",
  initialOpenId,
  linkToChurn = false,
}: {
  customers: AtRisk[];
  limit?: number;
  sender?: string;
  initialOpenId?: string;
  linkToChurn?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(initialOpenId ?? null);
  const shown = limit ? customers.slice(0, limit) : customers;
  if (!shown.length) {
    return (
      <Card>
        <StateMessage
          icon={HeartPulse}
          title="Aucun client à risque."
          description="Aucune résiliation programmée, aucun impayé, aucun paiement échoué, aucune carte sur le point d'expirer. Nous vous prévenons dès qu'un signal apparaît."
        />
      </Card>
    );
  }
  const rowClass =
    "grid w-full cursor-pointer grid-cols-1 gap-3 px-6 py-4 text-left transition-colors hover:bg-cream/60 focus-visible:bg-cream/60 focus-visible:outline-none @3xl:grid-cols-[1.4fr_0.6fr_1fr_auto] @3xl:items-center";
  return (
    <Card className="p-0">
      <ol className="divide-y divide-line">
        {shown.map((customer, index) => {
          // Contenu en éléments en ligne : il se place aussi bien dans un lien que dans un bouton.
          const content = (
            <>
              <span className="block min-w-0">
                <span className="block truncate font-semibold text-ink">{customer.name}</span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {customer.reasons.map((reason) => (
                    <Badge key={reason.kind} tone="attention">
                      {reason.label}
                    </Badge>
                  ))}
                </span>
              </span>
              <span className="block text-sm text-ink tabular-nums">
                <span className="font-semibold text-forest">{formatEuro(customer.mrr)}</span> / mois
                {customer.periodEnd && (
                  <span className="block text-xs text-slate">
                    Échéance le {dayMonth(customer.periodEnd)}
                  </span>
                )}
              </span>
              <span className="block">
                <span className="mb-1.5 flex justify-between text-xs text-slate">
                  <span className="font-semibold text-ink">
                    {customer.level === "retain" ? "À retenir" : "À surveiller"}
                  </span>
                  <span className="text-gold-ink tabular-nums">
                    <span className="sr-only">Score de risque : </span>
                    {customer.score} / 100
                  </span>
                </span>
                <GrowBar share={customer.score} tone="gold" delay={index * STAGGER} />
              </span>
              <span className="hidden text-slate @3xl:block" aria-hidden>
                <Icon icon={ChevronRight} anim="nudge" className="size-5" />
              </span>
            </>
          );
          return (
            <li key={customer.customerId} data-icon-trigger>
              {linkToChurn ? (
                <Link
                  href={`/app/churn?client=${encodeURIComponent(customer.customerId)}`}
                  className={rowClass}
                  aria-label={`Voir la fiche de ${customer.name}`}
                >
                  {content}
                </Link>
              ) : (
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => setOpenId(customer.customerId)}
                  aria-label={`Ouvrir la fiche de ${customer.name}`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {!linkToChurn && (
        <CustomerSheet
          customer={customers.find((customer) => customer.customerId === openId)}
          onClose={() => setOpenId(null)}
          sender={sender}
        />
      )}
    </Card>
  );
}
