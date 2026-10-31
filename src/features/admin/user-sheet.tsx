"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarPlus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  INTERVAL_LABELS,
  PAYMENT_LABELS,
  PLAN_LABELS,
  PRO_DEFAULT_PRICE,
  STATUS_LABELS,
  type BillingInterval,
  type PaymentMethod,
  type PlanId,
  type SubscriptionStatus,
} from "./metrics";
import { deleteUser, extendTrial, setSuperAdmin, updateSubscription } from "./user-actions";
import { channelLabel, lastActivity, StatusBadge } from "./user-format";
import type { AdminUserRow } from "./users-table";

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const SETUP_LABELS = {
  site: "Adresse du site à saisir",
  script: "Script à installer",
  stripe: "Stripe à connecter",
  done: "Configuration terminée",
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="mb-3 eyebrow">{title}</h3>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-slate">{label}</dt>
          <dd className="min-w-0 truncate text-right text-ink">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubscriptionForm({ user }: { user: AdminUserRow }) {
  const [plan, setPlan] = useState<PlanId>(user.plan);
  const [interval, setInterval] = useState<BillingInterval | "">(user.billing_interval ?? "");
  const [method, setMethod] = useState<PaymentMethod | "">(user.payment_method ?? "");
  const [status, setStatus] = useState<SubscriptionStatus>(user.subscription_status);
  const [price, setPrice] = useState(String(user.custom_monthly_price ?? PRO_DEFAULT_PRICE));
  const [note, setNote] = useState(user.admin_note ?? "");
  const [isPending, startTransition] = useTransition();
  const isTrial = plan === "trial";

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateSubscription({
        userId: user.id,
        plan,
        billingInterval: isTrial ? null : interval || "monthly",
        paymentMethod: isTrial ? null : method || null,
        status,
        customMonthlyPrice: plan === "pro" ? Number(price) || 0 : null,
        adminNote: note,
      });
      if (result.ok) toast.success("Abonnement mis à jour.");
      else toast.error(result.message);
    });
  };

  return (
    <form onSubmit={save} className="grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate">
        Offre
        <NativeSelect value={plan} onChange={(event) => setPlan(event.target.value as PlanId)}>
          {Object.entries(PLAN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate">
        Statut
        <NativeSelect
          value={status}
          onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate">
        Rythme
        <NativeSelect
          value={isTrial ? "" : interval || "monthly"}
          disabled={isTrial}
          onChange={(event) => setInterval(event.target.value as BillingInterval)}
        >
          {isTrial && <option value="">—</option>}
          {Object.entries(INTERVAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate">
        Moyen de paiement
        <NativeSelect
          value={isTrial ? "" : method}
          disabled={isTrial}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
        >
          <option value="">Non renseigné</option>
          {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      {plan === "pro" && (
        <label className="col-span-2 flex flex-col gap-1.5 text-xs font-semibold text-slate">
          Prix négocié (€ par mois)
          <Input
            type="number"
            min={0}
            max={100000}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="h-11"
          />
        </label>
      )}
      <label className="col-span-2 flex flex-col gap-1.5 text-xs font-semibold text-slate">
        Note interne
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={2}
          className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] font-normal text-ink outline-none focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15"
          placeholder="Visible uniquement par les super administrateurs"
        />
      </label>
      <Button type="submit" disabled={isPending} className="col-span-2">
        <Icon icon={Save} anim="pop" /> {isPending ? "Enregistrement…" : "Enregistrer l'abonnement"}
      </Button>
      <p className="col-span-2 text-xs text-slate">
        Gestion manuelle tant que Stripe Billing n&apos;est pas branché : aucun prélèvement
        n&apos;est déclenché d&apos;ici.
      </p>
    </form>
  );
}

function DeleteAccount({ user, onDeleted }: { user: AdminUserRow; onDeleted: () => void }) {
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = confirmation.trim().toLowerCase() === user.email.toLowerCase();
  const remove = () =>
    startTransition(async () => {
      const result = await deleteUser(user.id, confirmation);
      if (result.ok) {
        toast.success("Compte supprimé.");
        onDeleted();
      } else toast.error(result.message);
    });

  return (
    <Dialog onOpenChange={() => setConfirmation("")}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="border-danger text-danger hover:bg-danger/5"
        >
          <Icon icon={Trash2} anim="wiggle" /> Supprimer le compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce compte ?</DialogTitle>
          <DialogDescription>
            Le compte, son projet, ses réglages et son suivi sont effacés définitivement.
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Pour confirmer, tapez {user.email}
          <Input
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Annuler</Button>
          </DialogClose>
          <Button
            onClick={remove}
            disabled={!matches || isPending}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Fiche d'un utilisateur : abonnement modifiable, essai, provenance, activité, rôle. */
export function UserSheet({
  user,
  open,
  onOpenChange,
  isSelf,
}: {
  user: AdminUserRow | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const run = (action: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.message ?? "Action impossible.");
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        {user && (
          <>
            <SheetHeader>
              <SheetTitle className="truncate">{user.first_name || user.email}</SheetTitle>
              <SheetDescription className="truncate">{user.email}</SheetDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={user.subscription_status} />
                {user.isOnline && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-ink">
                    <span className="pulse-ring size-2 rounded-full bg-emerald text-emerald" />
                    En ligne
                  </span>
                )}
              </div>
            </SheetHeader>
            <SheetBody className="space-y-5 pb-8">
              <Section title="Abonnement">
                <SubscriptionForm key={user.id + user.updated_at} user={user} />
              </Section>

              <Section title="Essai gratuit">
                <p className="mb-3 text-sm text-ink">
                  Fin {user.isTrialOver ? "le" : "prévue le"}{" "}
                  {DATE.format(new Date(user.trial_ends_at))}.
                </p>
                <div className="flex flex-wrap gap-2">
                  {([7, 14] as const).map((days) => (
                    <Button
                      key={days}
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(() => extendTrial(user.id, days), `Essai prolongé de ${days} jours.`)
                      }
                    >
                      <Icon icon={CalendarPlus} anim="pop" /> +{days} jours
                    </Button>
                  ))}
                </div>
              </Section>

              <Section title="Provenance">
                <Facts
                  rows={[
                    ["Canal", channelLabel(user.signup_channel)],
                    ["Source", user.signup_source],
                    ["Support", user.signup_medium],
                    ["Campagne", user.signup_campaign],
                    ["Site référent", user.signup_referrer],
                    ["Page d'arrivée", user.signup_landing],
                  ]}
                />
              </Section>

              <Section title="Activité">
                <Facts
                  rows={[
                    ["Inscrit le", DATE.format(new Date(user.created_at))],
                    ["Dernière connexion", lastActivity(user.last_sign_in_at)],
                    [
                      "Dernière activité",
                      user.isOnline ? "En ligne" : lastActivity(user.last_seen_at),
                    ],
                    ["Site suivi", user.siteUrl?.replace(/^https?:\/\//, "")],
                    ["Configuration", SETUP_LABELS[user.setupStep]],
                  ]}
                />
              </Section>

              <Section title="Rôle">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-cream p-4">
                  <span className="flex items-start gap-3">
                    <Icon icon={ShieldCheck} anim="pop" className="mt-0.5 size-4 text-forest" />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        Super administrateur
                      </span>
                      <span className="block text-xs text-slate">
                        {isSelf
                          ? "C'est votre compte : votre rôle ne se modifie pas ici."
                          : "Contrôle total de SaasClair. À donner avec prudence."}
                      </span>
                    </span>
                  </span>
                  <Switch
                    checked={user.role === "super_admin"}
                    disabled={isSelf || isPending}
                    onCheckedChange={(checked) =>
                      run(
                        () => setSuperAdmin(user.id, checked),
                        checked ? "Rôle de super administrateur donné." : "Rôle retiré.",
                      )
                    }
                    aria-label="Super administrateur"
                  />
                </div>
              </Section>

              {!isSelf && (
                <Section title="Zone sensible">
                  <DeleteAccount user={user} onDeleted={() => onOpenChange(false)} />
                </Section>
              )}
            </SheetBody>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
