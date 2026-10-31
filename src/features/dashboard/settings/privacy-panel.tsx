"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { EyeOff, ShieldCheck, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { displaySiteUrl } from "@/lib/site-url";
import { deleteProject, setAnonymizeVisitors } from "./actions";

/** Suppression du projet : il faut retaper l'adresse du site, l'action est définitive. */
function DeleteProject({ siteUrl }: { siteUrl: string }) {
  const id = useId();
  const domain = displaySiteUrl(siteUrl);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = confirmation.trim().toLowerCase() === domain.toLowerCase();

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
          <DialogTitle>Supprimer {domain} ?</DialogTitle>
          <DialogDescription>
            Le suivi de votre site et l&apos;historique de vos insights seront effacés. Votre compte
            et vos réglages d&apos;alertes restent : vous pourrez relier un site à nouveau.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          Pour confirmer, tapez <span className="font-mono text-forest">{domain}</span>
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

export function PrivacyPanel({
  siteUrl,
  anonymizeVisitors,
}: {
  siteUrl: string | null;
  anonymizeVisitors: boolean;
}) {
  const [isAnonymous, setIsAnonymous] = useState(anonymizeVisitors);
  const [, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    setIsAnonymous(next);
    startTransition(async () => {
      const result = await setAnonymizeVisitors(next);
      if (!result.ok) {
        setIsAnonymous(!next);
        toast.error(result.message);
      } else toast.success(next ? "Visiteurs anonymisés." : "Anonymisation désactivée.");
    });
  };

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
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-cream p-4">
          <span className="flex items-start gap-3">
            <Icon icon={EyeOff} anim="wiggle" className="mt-0.5 size-4 text-forest" />
            <span>
              <span className="block font-semibold text-ink">Anonymiser les visiteurs</span>
              <span className="block text-[13px] text-slate">
                Aucune adresse IP n&apos;est conservée. Les clients restent reliés à leur
                provenance.
              </span>
            </span>
          </span>
          <Switch
            checked={isAnonymous}
            onCheckedChange={toggle}
            disabled={!siteUrl}
            aria-label="Anonymiser les visiteurs"
          />
        </div>
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
        {siteUrl ? (
          <DeleteProject siteUrl={siteUrl} />
        ) : (
          <p className="text-sm text-slate">Aucun projet relié pour l&apos;instant.</p>
        )}
      </Card>
    </div>
  );
}
