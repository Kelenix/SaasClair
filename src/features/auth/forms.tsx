"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { safeRedirectPath, setupPath } from "@/lib/safe-redirect";
import { displaySiteUrl, normalizeSiteUrl } from "@/lib/site-url";
import { requestMagicLink, requestPasswordReset, signIn, signUp, updatePassword } from "./actions";
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
  const params = useSearchParams();
  const site = normalizeSiteUrl(params.get("site") ?? "");
  const offer = params.get("offre") ?? "";
  const { state, isPending, field, onSubmit } = useAuthForm(signUpSchema, signUp);

  if (state.status === "check-email") {
    return (
      <CheckEmail email={state.email}>
        Cliquez dessus pour confirmer votre compte : la configuration démarre juste après. Rien reçu
        dans 2 minutes ? Regardez dans les indésirables.
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
        <input type="hidden" name="offre" value={offer} />
        <FormAlert message={state.message} />
        <AuthField label="Email" type="email" autoComplete="email" {...field("email")} />
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
  // Aussi le cas d'un lien de confirmation ouvert dans un autre navigateur : l'email est bien
  // confirmé, seule la session n'a pas pu s'ouvrir ici.
  lien: "Ce lien n'a pas pu ouvrir votre session ici. Si vous veniez de confirmer votre email, c'est fait : connectez-vous. Sinon, demandez un nouveau lien.",
};

export function SignInForm() {
  const params = useSearchParams();
  // Page demandée telle quelle (vérifiée côté serveur) ; vide = destination selon le compte.
  const requested = params.get("next") ?? "";
  const next = safeRedirectPath(requested);
  const linkError = LINK_ERRORS[params.get("erreur") ?? ""];
  const accountDeleted = params.get("compte") === "supprime";
  const { state, isPending, field, onSubmit } = useAuthForm(signInSchema, signIn);
  const [withLink, setWithLink] = useState(false);

  return (
    <>
      {accountDeleted && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald/30 bg-emerald-tint px-4 py-3 text-sm text-forest"
        >
          Votre compte est supprimé, avec toutes ses données. Votre abonnement est arrêté.
        </p>
      )}
      <OAuthButtons next={next} />
      <OrDivider />
      {withLink ? (
        <MagicLinkForm next={requested} onPassword={() => setWithLink(false)} />
      ) : (
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
          <button
            type="button"
            onClick={() => setWithLink(true)}
            className={`${LINK} min-h-11 cursor-pointer self-center text-sm`}
          >
            Sans mot de passe : recevoir un lien par email
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className={LINK}>
          Essai gratuit de 7 jours
        </Link>
      </p>
    </>
  );
}

/** Connexion sans mot de passe : un lien à usage unique, valable une heure. */
function MagicLinkForm({ next, onPassword }: { next: string; onPassword: () => void }) {
  const { state, isPending, field, onSubmit } = useAuthForm(resetRequestSchema, requestMagicLink);

  if (state.status === "check-email") {
    return (
      <CheckEmail email={state.email}>
        S&apos;il correspond à un compte, il vous connecte en un clic : ouvrez-le dans ce même
        navigateur. Rien reçu dans 2 minutes ? Regardez dans les indésirables.
      </CheckEmail>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FormAlert message={state.message} />
      <AuthField label="Email" type="email" autoComplete="email" {...field("email")} />
      <SubmitButton isPending={isPending}>
        Recevoir mon lien de connexion <Icon icon={ArrowRight} anim="nudge" />
      </SubmitButton>
      <button
        type="button"
        onClick={onPassword}
        className={`${LINK} min-h-11 cursor-pointer self-center text-sm`}
      >
        Se connecter avec un mot de passe
      </button>
    </form>
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
