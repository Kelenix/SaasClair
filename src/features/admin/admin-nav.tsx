"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, Menu } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, isAdminActive, type AdminCounts } from "./nav";

function NavList({
  counts,
  pillId,
  onNavigate,
}: {
  counts: AdminCounts;
  pillId: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace administrateur" className="flex flex-col gap-5">
      {ADMIN_NAV.map((group) => (
        <div key={group.title ?? "accueil"}>
          {group.title && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.14em] text-slate uppercase">
              {group.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isCurrent = isAdminActive(pathname, item.href);
              const badge = item.badge ? counts[item.badge] : 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink",
                      isCurrent ? "font-semibold text-forest" : "text-ink hover:bg-sand/70",
                    )}
                  >
                    {isCurrent && (
                      <m.span
                        layoutId={pillId}
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl bg-emerald-tint"
                      />
                    )}
                    <span className="relative flex">
                      <Icon icon={item.icon} anim={item.anim} className="size-[18px]" />
                    </span>
                    <span className="relative">{item.label}</span>
                    {badge > 0 && (
                      <span className="pulse-soft relative ml-auto grid min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-forest-deep">
                        {badge}
                        <span className="sr-only"> à traiter</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const BackLink = () => (
  <Link
    href="/app"
    className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold text-slate transition-colors hover:bg-sand/70 hover:text-forest"
  >
    <Icon icon={ArrowLeft} anim="nudge" className="size-4" /> Mon tableau de bord
  </Link>
);

/** Barre latérale claire de l'espace administrateur (ordinateur et tablette). */
export function AdminSidebar({ counts }: { counts: AdminCounts }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-white px-3 py-5 lg:flex">
      <Link href="/admin" aria-label="SaasClair, espace administrateur" className="mb-1 px-3">
        <Logo className="h-6" />
      </Link>
      <p className="mb-6 px-3 text-[11px] font-semibold tracking-[0.14em] text-emerald-ink uppercase">
        Super administrateur
      </p>
      <NavList counts={counts} pillId="admin-nav-active" />
      <div className="mt-auto border-t border-line pt-3">
        <BackLink />
      </div>
    </aside>
  );
}

/** Sur mobile et tablette : le menu glisse depuis la gauche. */
export function AdminMobileNav({ counts }: { counts: AdminCounts }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
          <Icon icon={Menu} anim="wiggle" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto px-3 py-6">
        <SheetTitle className="px-3 text-lg">Super administrateur</SheetTitle>
        <NavList
          counts={counts}
          pillId="admin-nav-active-mobile"
          onNavigate={() => setIsOpen(false)}
        />
        <div className="mt-2 border-t border-line pt-3">
          <BackLink />
        </div>
      </SheetContent>
    </Sheet>
  );
}
