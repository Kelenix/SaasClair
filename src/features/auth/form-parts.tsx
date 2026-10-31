"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, MailCheck } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GitHubLogo, GoogleLogo } from "@/components/brand/provider-logos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  isValid?: boolean;
  hint?: string;
  type?: "text" | "email" | "password";
  autoComplete: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

/** Champ avec validation en temps réel : message bienveillant, coche verte quand tout est bon. */
export function AuthField({
  label,
  name,
  value,
  error,
  isValid,
  hint,
  type = "text",
  autoComplete,
  onChange,
  onBlur,
}: AuthFieldProps) {
  const id = useId();
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === "password";
  const describedBy = error || hint ? `${id}-message` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={isPassword && isRevealed ? "text" : type}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(isPassword ? "pr-24" : "pr-12")}
        />
        <span className="absolute inset-y-0 right-2 flex items-center gap-1">
          {isValid && !error && (
            <m.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-emerald-ink"
              aria-hidden
            >
              <Icon icon={CircleCheck} className="size-5" />
            </m.span>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={() => setIsRevealed((revealed) => !revealed)}
              aria-pressed={isRevealed}
              className="grid size-10 cursor-pointer place-items-center rounded-full text-slate transition-colors hover:bg-sand hover:text-forest"
            >
              <Icon icon={isRevealed ? EyeOff : Eye} key={String(isRevealed)} className="size-5" />
              <span className="sr-only">
                {isRevealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              </span>
            </button>
          )}
        </span>
      </div>
      <AnimatePresence initial={false} mode="wait">
        {(error || hint) && (
          <m.p
            key={error ?? hint}
            id={describedBy}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.micro }}
            className={cn("text-[13px]", error ? "text-danger" : "text-slate")}
          >
            {error ?? hint}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SubmitButton({
  isPending,
  children,
}: {
  isPending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      size="lg"
      className="mt-2 w-full"
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? (
        <>
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          <span className="sr-only">Envoi en cours…</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** Message d'erreur global du formulaire, annoncé aux lecteurs d'écran. */
export function FormAlert({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <m.div
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.micro, ease: EASE_OUT }}
          className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-tint px-4 py-3 text-sm text-danger"
        >
          <Icon icon={CircleAlert} anim="wiggle" className="mt-0.5 size-4.5" />
          {message}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** Confirmation « vérifiez votre boîte mail » qui remplace le formulaire. */
export function CheckEmail({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <m.div
      role="status"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.screen, ease: EASE_OUT }}
      className="rounded-card border border-line bg-white p-7 text-center shadow-card"
    >
      <span className="pulse-soft mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
        <Icon icon={MailCheck} anim="bounce" className="size-7" />
      </span>
      <p className="mb-2 font-serif text-2xl font-semibold text-forest">Regardez vos emails.</p>
      <p className="text-[15px] text-slate">
        Nous avons envoyé un lien à <strong className="text-ink">{email}</strong>. {children}
      </p>
    </m.div>
  );
}

const PROVIDERS = [
  { id: "google", label: "Google", Logo: GoogleLogo },
  { id: "github", label: "GitHub", Logo: GitHubLogo },
] as const;

/**
 * Connexion en un clic. On vérifie d'abord que le fournisseur est activé : sinon Supabase
 * afficherait une page d'erreur technique au lieu d'un message clair.
 */
export function OAuthButtons({ next }: { next: string }) {
  const [pending, setPending] = useState<string | null>(null);

  async function connect(provider: (typeof PROVIDERS)[number]) {
    setPending(provider.id);
    try {
      const settings = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      }).then((response) => response.json() as Promise<{ external?: Record<string, boolean> }>);
      if (!settings.external?.[provider.id]) {
        toast.info(
          `La connexion avec ${provider.label} arrive bientôt. Utilisez votre email en attendant.`,
        );
        setPending(null);
        return;
      }
      const { error } = await createClient().auth.signInWithOAuth({
        provider: provider.id,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch {
      toast.error("La connexion n'a pas pu démarrer. Réessayez dans un instant.");
      setPending(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {PROVIDERS.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="secondary"
          className="border-line bg-white text-ink hover:border-forest/40 hover:bg-white"
          onClick={() => connect(provider)}
          disabled={pending !== null}
        >
          {pending === provider.id ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
          ) : (
            <span className="icon">
              <provider.Logo className="size-5" />
            </span>
          )}
          Continuer avec {provider.label}
        </Button>
      ))}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-[13px] text-slate" role="separator">
      <span className="h-px flex-1 bg-line" />
      ou avec votre email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
