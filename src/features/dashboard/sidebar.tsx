"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { m } from "motion/react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SPRING } from "@/lib/motion";
import { displaySiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { isActive, NAV_ITEMS, SETTINGS_ITEM, type NavItem } from "./nav";

const COLLAPSED_KEY = "sc_barre_repliee";

// Préférence « barre repliée » gardée dans le navigateur ; dépliée au rendu serveur.
const collapseListeners = new Set<() => void>();
const subscribeToCollapse = (listener: () => void) => {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
};
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false; // Stockage indisponible (navigation privée) : barre dépliée.
  }
};
const writeCollapsed = (isCollapsed: boolean) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, isCollapsed ? "1" : "0");
  } catch {
    // Préférence non mémorisée : sans conséquence.
  }
  collapseListeners.forEach((listener) => listener());
};

function NavLink({
  item,
  isCompact,
  pathname,
}: {
  item: NavItem;
  isCompact: boolean;
  pathname: string;
}) {
  const isCurrent = isActive(pathname, item.href);
  const link = (
    <Link
      href={item.href}
      aria-current={isCurrent ? "page" : undefined}
      aria-label={isCompact ? item.label : undefined}
      className={cn(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
        isCompact && "justify-center px-0",
        isCurrent ? "font-semibold text-cream" : "text-cream/65 hover:bg-white/6 hover:text-cream",
      )}
    >
      {isCurrent && (
        <m.span
          layoutId={isCompact ? "nav-active-compact" : "nav-active"}
          transition={SPRING}
          className="absolute inset-0 rounded-xl bg-white/12"
        />
      )}
      <span className="relative">
        <Icon icon={item.icon} anim={item.anim} className="size-[19px]" />
      </span>
      {!isCompact && <span className="relative">{item.label}</span>}
      {isCurrent && !isCompact && (
        <span className="relative ml-auto size-1.5 rounded-full bg-emerald" aria-hidden />
      )}
    </Link>
  );
  if (!isCompact) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

// Paramètres fait partie du menu, à la suite des autres écrans.
const MENU = [...NAV_ITEMS, SETTINGS_ITEM];

/** Bouton icône qui replie ou déplie la barre (ordinateur uniquement). */
function CollapseButton({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const label = isCollapsed ? "Déplier le menu" : "Replier le menu";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-expanded={!isCollapsed}
          className="hidden size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-cream/75 transition-colors outline-none hover:bg-white/6 hover:text-cream focus-visible:outline-2 focus-visible:outline-emerald lg:grid"
        >
          <Icon
            icon={isCollapsed ? PanelLeftOpen : PanelLeftClose}
            anim="nudge"
            className="size-[19px]"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Barre latérale vert forêt : complète et repliable sur ordinateur, réduite aux icônes sur
 * tablette, remplacée par la barre du bas sur mobile.
 */
export function Sidebar({ siteUrl }: { siteUrl: string | null }) {
  const pathname = usePathname();
  const isCollapsed = useSyncExternalStore(subscribeToCollapse, readCollapsed, () => false);
  const toggle = () => writeCollapsed(!isCollapsed);

  return (
    <aside
      data-collapsed={isCollapsed}
      className="group/sidebar sticky top-0 hidden h-dvh w-20 shrink-0 flex-col bg-forest px-3 py-5 text-cream transition-[width] duration-300 ease-out md:flex lg:w-64 lg:data-[collapsed=true]:w-20"
    >
      {/* En haut : le logo, et le bouton qui replie la barre (en dessous quand elle est repliée). */}
      <div className="mb-6 flex flex-col items-center gap-3 lg:flex-row lg:justify-between lg:group-data-[collapsed=true]/sidebar:flex-col">
        <Link
          href="/app"
          aria-label="SaasClair, accueil"
          className="flex h-9 items-center rounded-md px-1"
        >
          <Logo
            variant="mark"
            className="size-9 lg:hidden lg:group-data-[collapsed=true]/sidebar:block"
          />
          <Logo
            variant="inverse"
            className="hidden h-6 lg:block lg:group-data-[collapsed=true]/sidebar:hidden"
          />
        </Link>
        <CollapseButton isCollapsed={isCollapsed} onToggle={toggle} />
      </div>

      {siteUrl && (
        <div className="mb-5 hidden rounded-xl bg-white/8 px-3 py-2.5 lg:block lg:group-data-[collapsed=true]/sidebar:hidden">
          <p className="text-[11px] text-cream/75">Projet actif</p>
          <p className="truncate text-[13px] font-semibold">{displaySiteUrl(siteUrl)}</p>
        </div>
      )}

      <nav aria-label="Navigation du tableau de bord" className="flex flex-1 flex-col gap-1">
        {/* Deux rendus : icônes seules (tablette ou barre repliée) et complet (ordinateur). */}
        <div className="flex flex-col gap-1 lg:hidden lg:group-data-[collapsed=true]/sidebar:flex">
          {MENU.map((item) => (
            <NavLink key={item.href} item={item} isCompact pathname={pathname} />
          ))}
        </div>
        <div className="hidden flex-col gap-1 lg:flex lg:group-data-[collapsed=true]/sidebar:hidden">
          {MENU.map((item) => (
            <NavLink key={item.href} item={item} isCompact={false} pathname={pathname} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
