import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ConsentSettingsButton } from "@/features/site-content/consent";
import { NewsletterForm } from "@/features/site-content/newsletter-form";
import { getAboutPage, getPublicSettings, hasTrackers } from "@/features/site-content/queries";
import { NAV_LINKS } from "./content";

const LINK = "flex min-h-11 items-center rounded-md transition-colors hover:text-cream";

export async function SiteFooter() {
  const [settings, about] = await Promise.all([getPublicSettings(), getAboutPage()]);
  const links = [
    ...NAV_LINKS,
    ...(about ? [{ href: "/a-propos", label: "À propos" }] : []),
    { href: "/connexion", label: "Connexion" },
    { href: "/inscription", label: "Essai gratuit" },
    { href: "/confidentialite", label: "Confidentialité" },
  ];

  return (
    <footer className="bg-forest text-sm text-cream/80">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-10 md:grid-cols-[1fr_auto_1fr] md:gap-12">
        <div className="max-w-xs">
          <Logo variant="inverse" className="mb-4 h-6" />
          <p>Captez plus de clients, gardez-les plus longtemps.</p>
        </div>
        <nav aria-label="Pied de page" className="grid grid-cols-2 content-start gap-x-12 gap-y-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={LINK}>
              {link.label}
            </Link>
          ))}
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className={LINK}>
              Contact
            </a>
          )}
          {hasTrackers(settings) && <ConsentSettingsButton className={LINK} />}
        </nav>
        <div className="md:justify-self-end">
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-cream/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-[13px] text-cream/75 sm:px-10">
          © SaasClair · Kelenix Tech · Données hébergées en Europe (Allemagne)
        </p>
      </div>
    </footer>
  );
}
