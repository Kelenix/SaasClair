"use client";

import { Copy, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useActionState, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormAlert, SubmitButton } from "@/features/auth/form-parts";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { confirmCode, startEnrollment, type Enrollment, type MfaState } from "./mfa-actions";

/** Champ du code à 6 chiffres : clavier numérique, rempli par le téléphone quand il le propose. */
function CodeForm({ factorId, submitLabel }: { factorId: string; submitLabel: string }) {
  const [state, action, isPending] = useActionState<MfaState, FormData>(confirmCode, {});
  const id = useId();
  return (
    <form action={action} method="post" className="flex flex-col gap-3">
      <FormAlert message={state.message} />
      <input type="hidden" name="factorId" value={factorId} />
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        Code à 6 chiffres
      </label>
      <Input
        id={id}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        required
        autoFocus
        placeholder="123 456"
        className="text-center font-serif text-2xl tracking-[0.3em] tabular-nums"
      />
      <SubmitButton isPending={isPending}>{submitLabel}</SubmitButton>
    </form>
  );
}

/** Session simple d'un super administrateur déjà équipé : le code du jour, et c'est tout. */
export function MfaChallenge({ factorId }: { factorId: string }) {
  return (
    <Card className="flex flex-col gap-5" data-icon-trigger>
      <span className="grid size-12 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
        <Icon icon={KeyRound} anim="pop" className="size-6" />
      </span>
      <p className="text-sm text-slate">
        Ouvrez votre application d&apos;authentification et entrez le code affiché pour SaasClair.
      </p>
      <CodeForm factorId={factorId} submitLabel="Ouvrir l'administration" />
    </Card>
  );
}

/** Premier passage : relier une application d'authentification en 2 étapes. */
export function MfaEnroll() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [isPending, startTransition] = useTransition();
  const ready = enrollment && "factorId" in enrollment ? enrollment : null;

  const begin = () =>
    startTransition(async () => {
      const result = await startEnrollment();
      setEnrollment(result);
      if ("error" in result) toast.error(result.error);
    });

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Clé copiée.");
    } catch {
      toast.error("Copie impossible : recopiez la clé à la main.");
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!ready ? (
        <m.div
          key="intro"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: DURATION.screen, ease: EASE_OUT }}
        >
          <Card className="flex flex-col gap-5" data-icon-trigger>
            <span className="grid size-12 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
              <Icon icon={Smartphone} anim="pop" className="size-6" />
            </span>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate">
              <li>
                Installez une application d&apos;authentification sur votre téléphone : Google
                Authenticator, Microsoft Authenticator, 1Password ou Authy.
              </li>
              <li>Scannez le QR code affiché à l&apos;étape suivante.</li>
              <li>Entrez le code à 6 chiffres qu&apos;elle affiche.</li>
            </ol>
            <Button size="lg" className="w-full" onClick={begin} disabled={isPending}>
              <Icon icon={ShieldCheck} anim="pop" />
              {isPending ? "Préparation…" : "Activer la double authentification"}
            </Button>
          </Card>
        </m.div>
      ) : (
        <m.div
          key="scan"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.screen, ease: EASE_OUT }}
        >
          <Card className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {/* QR code fourni par Supabase (image SVG en data:), rien à optimiser. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ready.qrCode}
                alt="QR code à scanner avec votre application d'authentification"
                width={176}
                height={176}
                className="size-44 shrink-0 rounded-xl border border-line bg-white p-2"
              />
              <div className="min-w-0 text-sm text-slate">
                <p className="mb-2">
                  Scannez ce QR code avec l&apos;application. Impossible de scanner ? Entrez cette
                  clé à la main :
                </p>
                <p className="mb-2 rounded-lg bg-sand px-3 py-2 font-mono text-xs break-all text-ink">
                  {ready.secret}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => copySecret(ready.secret)}
                >
                  <Icon icon={Copy} anim="pop" /> Copier la clé
                </Button>
              </div>
            </div>
            <CodeForm
              factorId={ready.factorId}
              submitLabel="Confirmer et ouvrir l'administration"
            />
          </Card>
        </m.div>
      )}
    </AnimatePresence>
  );
}
