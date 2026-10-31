import {
  Filter,
  HeartHandshake,
  House,
  Lightbulb,
  Route,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { IconAnimation } from "@/components/brand/icon";

export type NavItem = { href: string; label: string; icon: LucideIcon; anim: IconAnimation };

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Accueil", icon: House, anim: "bounce" },
  { href: "/app/acquisition", label: "Acquisition", icon: Route, anim: "nudge" },
  { href: "/app/tunnel", label: "Tunnel", icon: Filter, anim: "bounce" },
  { href: "/app/churn", label: "Churn", icon: HeartHandshake, anim: "pop" },
  { href: "/app/revenus", label: "Revenus", icon: Wallet, anim: "tilt" },
  { href: "/app/insights", label: "Insights", icon: Lightbulb, anim: "wiggle" },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/app/parametres",
  label: "Paramètres",
  icon: Settings,
  anim: "spin",
};

/** Barre de navigation mobile : les 4 premiers écrans, le reste dans « Plus ». */
export const MOBILE_PRIMARY = NAV_ITEMS.slice(0, 4);
export const MOBILE_MORE = [...NAV_ITEMS.slice(4), SETTINGS_ITEM];

export const isActive = (pathname: string, href: string) =>
  href === "/app" ? pathname === "/app" : pathname.startsWith(href);
