"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DURATION, EASE_OUT, STAGGER } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./content";

const MENU_LINKS = [...NAV_LINKS, { href: "/connexion", label: "Connexion" }];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setIsScrolled(y > 8));

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setIsMenuOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMenuOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow] duration-300",
        isScrolled || isMenuOpen
          ? "bg-cream/90 shadow-[0_1px_0_var(--line)] backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 sm:px-10"
      >
        <Link href="/" aria-label="SaasClair, accueil" className="rounded-md">
          <Logo priority className="h-6 sm:h-7" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {MENU_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md text-[15px] font-medium text-slate transition-colors hover:text-forest"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild size="sm">
            <Link href="/inscription">Essai gratuit</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <Icon
            icon={isMenuOpen ? X : Menu}
            anim={isMenuOpen ? "spin" : "pop"}
            key={String(isMenuOpen)}
          />
          <span className="sr-only">{isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
        </Button>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <m.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: DURATION.micro + 0.05, ease: EASE_OUT }}
            className="absolute inset-x-0 top-full border-b border-line bg-cream px-4 pt-2 pb-6 shadow-float md:hidden"
          >
            <ul className="flex flex-col">
              {MENU_LINKS.map((link, index) => (
                <m.li
                  key={link.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * STAGGER, duration: DURATION.micro, ease: EASE_OUT }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex min-h-12 items-center border-b border-line text-lg font-medium text-forest"
                  >
                    {link.label}
                  </Link>
                </m.li>
              ))}
            </ul>
            <Button asChild className="mt-5 w-full">
              <Link href="/inscription" onClick={() => setIsMenuOpen(false)}>
                Essai gratuit
              </Link>
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
