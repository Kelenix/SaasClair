"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { EyeOff, ShieldCheck, Trash2, UserX } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
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
import { displaySiteUrl } from "@/lib/site-url";
import { deleteMyAccount, deleteProject } from "./actions";

/**
 * Suppression du projet : il faut retaper l'adresse du site (ou « supprimer » si le projet n'a
 * pas encore d'adresse). L'action est définitive ; l'accès Stripe est coupé chez Stripe.
 */
function DeleteProject({ siteUrl }: { siteUrl: string | null }) {
  const id = useId();
  const expected = siteUrl ? displaySiteUrl(siteUrl) : "supprimer";
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = confirmation.trim().toLowerCase() === expected.toLowerCase();

  const remove = () =>
    startTransition(async () => {
      // En cas de succès, le serveur redirige vers la configuration.
      const result = await deleteProject(confirmation);
      if (!result.ok) toast.error(result.message);
    });

  return (
    <Dialog onOpenChange={() => setConfirmation("")}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="border-danger text-danger hover:bg-danger/5"
        >
          <Icon icon={Trash2} anim="wiggle" /> Supprimer le projet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{siteUrl ? `Supprimer ${expected} ?` : "Supprimer le projet ?"}</DialogTitle>
          <DialogDescription>
            Le suivi de votre site et l&apos;historique de vos insights seront effacés, et
            l&apos;accès à votre Stripe coupé. Votre compte et vos réglages d&apos;alertes restent :
            vous pourrez relier un site à nouveau.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          Pour confirmer, tapez <span className="font-mono text-forest">{expected}</span>
        </label>
        <Input
          id={id}
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
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

/**
 * Suppression du compte : il faut retaper son email. Tout est effacé, l'abonnement SaasClair est
 * arrêté et l'accès Stripe coupé ; l'utilisateur revient au site, déconnecté.
 */
function DeleteAccount({ email }: { email: string }) {
  const id = useId();
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = confirmation.trim().toLowerCase() === email.toLowerCase();

  const remove = () =>
    startTransition(async () => {
      // En cas de succès, le serveur déconnecte et renvoie vers le site.
      const result = await deleteMyAccount(confirmation);
      if (!result.ok) toast.error(result.message);
    });

  return (
    <Dialog onOpenChange={() => setConfirmation("")}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="border-danger text-danger hover:bg-danger/5"
        >
          <Icon icon={UserX} anim="wiggle" /> Supprimer mon compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer votre compte ?</DialogTitle>
          <DialogDescription>
            Votre compte, votre projet, l&apos;historique de vos visites et de vos insights et vos
            réglages seront effacés. Votre abonnement SaasClair s&apos;arrête aussitôt, sans nouveau
            prélèvement, et l&apos;accès à votre Stripe est coupé. Rien ne pourra être récupéré.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          Pour confirmer, tapez votre email <span className="font-mono text-forest">{email}</span>
        </label>
        <Input
          id={id}
          type="email"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Annuler</Button>
          </DialogClose>
          <Button
            onClick={remove}
            disabled={!matches || isPending}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {isPending ? "Suppression…" : "Supprimer mon compte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ce que SaasClair garde vraiment : la collecte est anonyme par construction, sans réglage. */
const GUARANTEES = [
  "Aucune adresse IP enregistrée",
  "Aucun cookie : un identifiant aléatoire, gardé 13 mois au plus dans le navigateur",
  "Emails jamais en clair : seulement leur empreinte (SHA-256)",
  "Visites effacées au bout de 25 mois",
];

export function PrivacyPanel({
  siteUrl,
  hasProject,
  email,
  isSuperAdmin = false,
}: {
  siteUrl: string | null;
  /** Un projet existe (même sans adresse de site) : il peut être supprimé. */
  hasProject: boolean;
  /** Email du compte, à retaper pour le supprimer. */
  email: string;
  isSuperAdmin?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <CardEyebrow>Confidentialité</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              Vos visiteurs restent anonymes.
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
            <Icon icon={ShieldCheck} anim="pop" />
          </span>
        </div>
        <ul className="flex flex-col gap-2.5 rounded-2xl bg-cream p-4">
          {GUARANTEES.map((guarantee) => (
            <li key={guarantee} className="flex items-start gap-3 text-sm text-ink">
              <Icon icon={EyeOff} anim="wiggle" className="mt-0.5 size-4 shrink-0 text-forest" />
              {guarantee}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate">
          SaasClair ne fait que lire votre compte Stripe : nous ne modifions jamais rien sur votre
          compte.
        </p>
      </Card>

      <Card className="border-danger/30">
        <CardEyebrow>Suppression des données</CardEyebrow>
        <p className="mb-2 font-serif text-xl font-semibold text-forest">
          Repartir de zéro, à tout moment.
        </p>
        <p className="mb-5 text-[15px] text-ink">
          La suppression efface le projet et tout son historique. Elle ne peut pas être annulée.
        </p>
        {hasProject ? (
          <DeleteProject siteUrl={siteUrl} />
        ) : (
          <p className="text-sm text-slate">Aucun projet relié pour l&apos;instant.</p>
        )}
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-1 font-semibold text-ink">Supprimer mon compte</p>
          <p className="mb-4 text-sm text-slate">
            Tout est effacé et votre abonnement s&apos;arrête. C&apos;est définitif.
          </p>
          {isSuperAdmin ? (
            <p className="text-sm text-slate">
              Compte super administrateur : retirez d&apos;abord ce rôle pour pouvoir le supprimer.
            </p>
          ) : (
            <DeleteAccount email={email} />
          )}
        </div>
      </Card>
    </div>
  );
}
