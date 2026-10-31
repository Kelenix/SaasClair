"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { safeRedirectPath, setupPath } from "@/lib/safe-redirect";
import { displaySiteUrl, normalizeSiteUrl } from "@/lib/site-url";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";
import {
  AuthField,
  CheckEmail,
  FormAlert,
  OAuthButtons,
  OrDivider,
  SubmitButton,
} from "./form-parts";
import {
  newPasswordSchema,
  PASSWORD_MIN_LENGTH,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";
import { useAuthForm } from "./use-auth-form";

const PASSWORD_HINT = `Au moins ${PASSWORD_MIN_LENGTH} caractères.`;
const LINK = "rounded-md font-semibold text-forest underline-offset-4 hover:underline";

export function SignUpForm() {
  const site = normalizeSiteUrl(useSearchParams().get("site") ?? "");
  const { state, isPending, field, onSubmit } = useAuthForm(signUpSchema, signUp);

  if (state.status === "check-email") {
    return (
      <CheckEmail email={state.email}>
        Cliquez dessus pour confirmer votre compte : la configuration démarre juste après.
      </CheckEmail>
    );
  }

  return (
    <>
      {site && (
        <p className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] text-forest">
          <Icon icon={Globe} anim="spin" className="size-4 shrink-0" />
          <span className="truncate">
            L&apos;analyse de <strong>{displaySiteUrl(site)}</strong> démarre juste après.
          </span>
        </p>
      )}
      <OAuthButtons next={setupPath(site)} />
      <OrDivider />
      <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="site" value={site ?? ""} />
        <FormAlert message={state.message} />
        <AuthField label="Prénom" autoComplete="given-name" {...field("firstName")} />
        <AuthField
          label="Email professionnel"
          type="email"
          autoComplete="email"
          {...field("email")}
        />
        <AuthField
          label="Mot de passe"
          type="password"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
          {...field("password")}
        />
        <SubmitButton isPending={isPending}>
          Créer mon compte <Icon icon={ArrowRight} anim="nudge" />
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate">
        Déjà un compte ?{" "}
        <Link
          href={site ? `/connexion?next=${encodeURIComponent(setupPath(site))}` : "/connexion"}
          className={LINK}
        >
          Se connecter
        </Link>
      </p>
    </>
  );
}

const LINK_ERRORS: Record<string, string> = {
  lien: "Ce lien n'est plus valable. Connectez-vous, ou demandez un nouveau lien.",
};

export function SignInForm() {
  const params = useSearchParams();
  // Page demandée telle quelle (vérifiée côté serveur) ; vide = destination selon le compte.
  const requested = params.get("next") ?? "";
  const next = safeRedirectPath(requested);
  const linkError = LINK_ERRORS[params.get("erreur") ?? ""];
  const { state, isPending, field, onSubmit } = useAuthForm(signInSchema, signIn);

  return (
    <>
      <OAuthButtons next={next} />
      <OrDivider />
      <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="next" value={requested} />
        <FormAlert message={state.message ?? linkError} />
        <AuthField label="Email" type="email" autoComplete="email" {...field("email")} />
        <AuthField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          {...field("password")}
        />
        <Link href="/mot-de-passe-oublie" className={`${LINK} -mt-1 self-end text-[13px]`}>
          Mot de passe oublié ?
        </Link>
        <SubmitButton isPending={isPending}>
          Se connecter <Icon icon={ArrowRight} anim="nudge" />
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className={LINK}>
          Essai gratuit de 14 jours
        </Link>
      </p>
    </>
  );
}

export function ResetRequestForm() {
  const { state, isPending, field, onSubmit } = useAuthForm(
    resetRequestSchema,
    requestPasswordReset,
  );

  if (state.status === "check-email") {
    return (
      <CheckEmail email={state.email}>
        S&apos;il correspond à un compte, il vous permet de choisir un nouveau mot de passe.
      </CheckEmail>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={state.message} />
      <AuthField label="Email" type="email" autoComplete="email" {...field("email")} />
      <SubmitButton isPending={isPending}>Recevoir le lien</SubmitButton>
      <Link href="/connexion" className={`${LINK} mt-2 self-center text-sm`}>
        Retour à la connexion
      </Link>
    </form>
  );
}

export function NewPasswordForm() {
  const { state, isPending, field, onSubmit } = useAuthForm(newPasswordSchema, updatePassword);
  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={state.message} />
      <AuthField
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        hint={PASSWORD_HINT}
        {...field("password")}
      />
      <SubmitButton isPending={isPending}>Enregistrer et continuer</SubmitButton>
    </form>
  );
}
