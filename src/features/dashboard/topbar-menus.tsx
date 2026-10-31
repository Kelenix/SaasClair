"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { Bell, CreditCard, LogOut, Settings, ShieldCheck, UserMinus, Wrench } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const NOTIFICATIONS = [
  {
    id: "2026-10-30-lumen-bureau",
    icon: UserMinus,
    title: "Lumen Bureau risque de partir",
    detail: "Pas de connexion depuis 18 jours · 420 € / mois",
    href: "/app/churn?client=lumen-bureau",
  },
  {
    id: "2026-10-30-paiements",
    icon: CreditCard,
    title: "2 paiements ont échoué",
    detail: "450 € à récupérer · relance envoyée automatiquement",
    href: "/app/revenus",
  },
  {
    id: "2026-10-29-conversion-mobile",
    icon: Wrench,
    title: "Conversion mobile en baisse",
    detail: "−18 % sur 14 jours · cause probable trouvée",
    href: "/app/tunnel",
  },
];

// Notifications lues, gardées dans le navigateur (démonstration : pas encore de moteur d'alertes).
const READ_KEY = "sc_notifications_lues";
const readListeners = new Set<() => void>();
const subscribeToRead = (listener: () => void) => {
  readListeners.add(listener);
  return () => readListeners.delete(listener);
};
let readCache: { raw: string | null; ids: string[] } = { raw: null, ids: [] };
const readIds = () => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(READ_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : tout reste non lu.
  }
  // Même tableau tant que rien ne change : useSyncExternalStore exige un instantané stable.
  if (raw !== readCache.raw) {
    try {
      readCache = { raw, ids: raw ? (JSON.parse(raw) as string[]) : [] };
    } catch {
      readCache = { raw, ids: [] };
    }
  }
  return readCache.ids;
};
const NONE_READ: string[] = [];
const markRead = (ids: string[]) => {
  const next = [...new Set([...readIds(), ...ids])];
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(next));
  } catch {
    // Non mémorisé : sans conséquence.
  }
  readListeners.forEach((listener) => listener());
};

export function NotificationsMenu() {
  const read = useSyncExternalStore(subscribeToRead, readIds, () => NONE_READ);
  const unread = NOTIFICATIONS.filter((item) => !read.includes(item.id)).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread ? `Alertes, ${unread} non lue${unread > 1 ? "s" : ""}` : "Alertes, tout est lu"
          }
        >
          <Icon icon={Bell} anim="wiggle" />
          <AnimatePresence initial={false}>
            {unread > 0 && (
              <m.span
                key={unread}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={SPRING}
                aria-hidden
                className="absolute top-2 right-2 grid size-4 place-items-center rounded-full bg-gold text-[10px] font-bold text-forest-deep"
              >
                {unread}
              </m.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex items-center justify-between gap-2 pr-1">
          <DropdownMenuLabel className="px-3 py-2 font-serif text-base text-forest">
            Alertes
          </DropdownMenuLabel>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead(NOTIFICATIONS.map((item) => item.id))}
              className="min-h-9 cursor-pointer rounded-full px-3 text-xs font-semibold text-forest transition-colors hover:bg-forest/6"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        {NOTIFICATIONS.map((item) => {
          const isUnread = !read.includes(item.id);
          return (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href} onClick={() => markRead([item.id])} className="items-start">
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                    isUnread ? "bg-gold-tint text-gold-ink" : "bg-sand text-slate",
                  )}
                >
                  <Icon icon={item.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn("block text-ink", isUnread ? "font-semibold" : "font-normal")}
                  >
                    {item.title}
                  </span>
                  <span className="block text-xs text-slate">{item.detail}</span>
                </span>
                {isUnread && (
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-emerald">
                    <span className="sr-only">Non lue</span>
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          );
        })}
        {unread === 0 && (
          <p className="px-3 pt-1 pb-2 text-xs text-slate">
            Tout est lu. Nous vous prévenons dès qu&apos;un chiffre bouge.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ProfileMenu({
  firstName,
  email,
  isSuperAdmin = false,
}: {
  firstName: string;
  email: string;
  isSuperAdmin?: boolean;
}) {
  const initial = (firstName || email).charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Votre profil"
          className="grid size-11 cursor-pointer place-items-center rounded-full transition-transform active:scale-95"
        >
          <span className="grid size-9 place-items-center rounded-full bg-gold font-serif text-base font-bold text-forest-deep">
            {initial}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block font-semibold text-ink">{firstName}</span>
          <span className="block truncate text-xs font-normal text-slate">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/parametres">
            <Icon icon={Settings} anim="spin" /> Paramètres
          </Link>
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Icon icon={ShieldCheck} anim="pop" /> Espace administrateur
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => signOut()}>
          <Icon icon={LogOut} anim="nudge" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
