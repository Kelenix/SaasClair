import {
  Activity,
  CircleHelp,
  CreditCard,
  Info,
  LayoutDashboard,
  Newspaper,
  Settings,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { IconAnimation } from "@/components/brand/icon";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  anim: IconAnimation;
  /** Clé du compteur affiché en pastille (voir AdminCounts). */
  badge?: keyof AdminCounts;
};

export type AdminCounts = { pastDue: number; online: number };

export const ADMIN_NAV: { title: string | null; items: AdminNavItem[] }[] = [
  {
    title: null,
    items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, anim: "pop" }],
  },
  {
    title: "Clients",
    items: [
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, anim: "bounce" },
      {
        href: "/admin/abonnements",
        label: "Abonnements",
        icon: CreditCard,
        anim: "tilt",
        badge: "pastDue",
      },
    ],
  },
  {
    title: "Audience",
    items: [{ href: "/admin/newsletter", label: "Newsletter", icon: Newspaper, anim: "wiggle" }],
  },
  {
    title: "Contenu du site",
    items: [
      { href: "/admin/temoignages", label: "Témoignages", icon: Star, anim: "spin" },
      { href: "/admin/faq", label: "FAQ", icon: CircleHelp, anim: "wiggle" },
      { href: "/admin/a-propos", label: "À propos", icon: Info, anim: "pop" },
    ],
  },
  {
    title: "Réglages",
    items: [
      { href: "/admin/parametres", label: "Paramètres", icon: Settings, anim: "spin" },
      { href: "/admin/systeme", label: "État du système", icon: Activity, anim: "nudge" },
    ],
  },
];

export const isAdminActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
