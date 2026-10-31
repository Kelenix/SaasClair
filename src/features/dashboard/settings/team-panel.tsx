"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, KeyRound, Send, ShieldCheck, Trash2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { DURATION, EASE_OUT } from "@/lib/motion";

type Role = "admin" | "viewer";

const ROLES = [
  {
    id: "owner",
    label: "Propriétaire",
    icon: KeyRound,
    detail: "Tout, y compris l'abonnement et la suppression du projet.",
  },
  {
    id: "admin",
    label: "Administrateur",
    icon: ShieldCheck,
    detail: "Tout, sauf l'abonnement et la suppression du projet.",
  },
  {
    id: "viewer",
    label: "Lecture seule",
    icon: Eye,
    detail: "Consulte les chiffres et les insights.",
  },
] as const;

const ROLE_LABEL: Record<Role, string> = { admin: "Administrateur", viewer: "Lecture seule" };
const SEATS = 5;
const emailSchema = z.email("Vérifiez l'adresse : par exemple prenom@entreprise.fr");

type Invite = { email: string; role: Role };

/** Équipe et rôles : invitation en une ligne, rôles expliqués simplement. */
export function TeamPanel({ firstName, email }: { firstName: string; email: string }) {
  const id = useId();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [isTouched, setIsTouched] = useState(false);
  const check = emailSchema.safeParse(address.trim());
  const isDuplicate =
    address.trim().toLowerCase() === email.toLowerCase() ||
    invites.some((invite) => invite.email === address.trim().toLowerCase());
  const error =
    !isTouched || !address
      ? undefined
      : !check.success
        ? check.error.issues[0]?.message
        : isDuplicate
          ? "Cette personne fait déjà partie de l'équipe."
          : undefined;
  const isFull = invites.length + 1 >= SEATS;

  const invite = (event: React.FormEvent) => {
    event.preventDefault();
    setIsTouched(true);
    if (!check.success || isDuplicate || isFull) return;
    const next = { email: address.trim().toLowerCase(), role };
    setInvites((current) => [...current, next]);
    setAddress("");
    setIsTouched(false);
    toast.success(`Invitation prête pour ${next.email}.`, {
      description: "En démonstration, aucun email n'est envoyé.",
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardEyebrow>Équipe</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              {invites.length + 1} membre{invites.length ? "s" : ""} sur {SEATS} places.
            </p>
          </div>
          <Badge>Offre Growth</Badge>
        </div>
        <ul className="mb-6">
          <li className="flex items-center justify-between gap-3 border-b border-line py-3">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold font-serif font-bold text-forest-deep">
                {(firstName || email).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">
                  {firstName || email} <span className="font-normal text-slate">(vous)</span>
                </span>
                <span className="block truncate text-xs text-slate">{email}</span>
              </span>
            </span>
            <Badge tone="brand">Propriétaire</Badge>
          </li>
          <AnimatePresence initial={false}>
            {invites.map((item) => (
              <m.li
                key={item.email}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: DURATION.screen, ease: EASE_OUT }}
                className="flex items-center justify-between gap-3 border-b border-line py-3"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream font-bold text-forest">
                    {item.email.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{item.email}</span>
                    <span className="block text-xs text-slate">
                      {ROLE_LABEL[item.role]} · invitation en attente
                    </span>
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer l'invitation de ${item.email}`}
                  onClick={() =>
                    setInvites((current) => current.filter((other) => other.email !== item.email))
                  }
                >
                  <Icon icon={Trash2} anim="wiggle" className="size-4" />
                </Button>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>

        <form onSubmit={invite} noValidate>
          <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
            Inviter une personne
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={id}
              type="email"
              autoComplete="off"
              placeholder="prenom@entreprise.fr"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              onBlur={() => setIsTouched(true)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              disabled={isFull}
            />
            <Button type="submit" disabled={isFull}>
              <Icon icon={Send} anim="nudge" /> Inviter
            </Button>
          </div>
          {error && (
            <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-danger">
              {error}
            </p>
          )}
          {isFull && (
            <p className="mt-1.5 text-[13px] text-slate">
              Toutes les places sont prises. L&apos;offre Pro en ajoute autant que nécessaire.
            </p>
          )}
          <Segmented
            label="Rôle de la personne invitée"
            options={[
              { value: "viewer", label: "Lecture seule" },
              { value: "admin", label: "Administrateur" },
            ]}
            value={role}
            onChange={setRole}
            pillId="invite-role"
            className="mt-3 w-fit"
          />
        </form>
      </Card>

      <Card>
        <CardEyebrow>Rôles</CardEyebrow>
        <p className="mb-4 font-serif text-xl font-semibold text-forest">Qui peut faire quoi.</p>
        <ul className="space-y-4">
          {ROLES.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream text-forest">
                <Icon icon={item.icon} anim="pop" className="size-4" />
              </span>
              <span>
                <span className="block font-semibold text-ink">{item.label}</span>
                <span className="block text-[13px] text-slate">{item.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
