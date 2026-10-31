"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { m } from "motion/react";
import { Ellipsis } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isActive, MOBILE_MORE, MOBILE_PRIMARY } from "./nav";

/** Barre de navigation en bas de l'écran sur mobile ; « Plus » ouvre un panneau qui glisse. */
export function MobileNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMoreActive = MOBILE_MORE.some((item) => isActive(pathname, item.href));

  const itemClass = (isCurrent: boolean) =>
    cn(
      "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
      isCurrent ? "text-forest" : "text-slate",
    );
  const indicator = (
    <m.span
      layoutId="mobile-nav-active"
      transition={SPRING}
      className="absolute inset-x-2 inset-y-1 rounded-2xl bg-emerald-tint"
    />
  );

  return (
    <nav
      aria-label="Navigation du tableau de bord"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex">
        {MOBILE_PRIMARY.map((item) => {
          const isCurrent = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={itemClass(isCurrent)}
            >
              {isCurrent && indicator}
              <span className="relative">
                <Icon icon={item.icon} anim={item.anim} className="size-5" />
              </span>
              <span className="relative max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger className={cn(itemClass(isMoreActive), "cursor-pointer")}>
            {isMoreActive && indicator}
            <span className="relative">
              <Icon icon={Ellipsis} anim="pop" className="size-5" />
            </span>
            <span className="relative">Plus</span>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Plus d&apos;écrans</SheetTitle>
            </SheetHeader>
            <SheetBody className="pb-6">
              <ul className="flex flex-col gap-1">
                {MOBILE_MORE.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      aria-current={isActive(pathname, item.href) ? "page" : undefined}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] text-ink aria-[current=page]:bg-emerald-tint aria-[current=page]:font-semibold aria-[current=page]:text-forest"
                    >
                      <Icon icon={item.icon} anim={item.anim} className="size-5 text-forest" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetBody>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
