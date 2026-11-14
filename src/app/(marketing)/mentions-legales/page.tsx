import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Qui édite SaasClair, qui l'héberge, et comment nous contacter.",
  alternates: { canonical: "/mentions-legales" },
};

const CONTACT = "lionelkelenix@gmail.com";
const UPDATED = "14 novembre 2026";

/** Une section : titre, puis paragraphes. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  );
}

const LINK = "font-semibold text-forest underline";

/**
 * Mentions légales (loi pour la confiance dans l'économie numérique). Adresse du siège et numéro
 * SIREN à ajouter dès que l'éditeur les fournit (docs/manual-tasks.md).
 */
export default function LegalNoticePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-10 sm:py-16">
      <Reveal>
        <p className="eyebrow">Informations légales</p>
        <h1 className="mb-5 text-[36px] leading-tight sm:text-[48px]">Mentions légales</h1>
        <p className="mb-10 text-lg text-slate">Dernière mise à jour : {UPDATED}.</p>
      </Reveal>

      <div className="space-y-10 text-[17px] leading-relaxed text-ink">
        <Section title="Éditeur du site">
          <p>
            Le site <strong>saasclair.com</strong> et l&apos;application SaasClair sont édités par{" "}
            <strong>Kelenix Tech</strong>.
          </p>
          <p>
            Directeur de la publication : <strong>Lionel</strong>.
          </p>
          <p>
            Contact :{" "}
            <a className={LINK} href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </Section>

        <Section title="Hébergeur">
          <p>
            <strong>Hostinger International Ltd</strong>, 61 Lordou Vironos Street, 6023 Larnaca,
            Chypre. Site :{" "}
            <a className={LINK} href="https://www.hostinger.fr" rel="noopener noreferrer">
              hostinger.fr
            </a>
            .
          </p>
          <p>Le serveur qui héberge SaasClair et ses données est situé à Francfort (Allemagne).</p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            Le nom SaasClair, son logo, ses textes, ses illustrations et son interface sont la
            propriété de Kelenix Tech. Toute reproduction, même partielle, demande notre accord
            écrit.
          </p>
        </Section>

        <Section title="Données personnelles et cookies">
          <p>
            Ce que SaasClair fait de vos données, combien de temps il les garde et comment exercer
            vos droits : tout est expliqué dans la{" "}
            <Link className={LINK} href="/confidentialite">
              politique de confidentialité
            </Link>
            . Les outils de mesure publicitaire ne se chargent qu&apos;avec votre accord, donné
            depuis le bandeau affiché à votre première visite.
          </p>
        </Section>

        <Section title="Nous écrire">
          <p>
            Une question, un contenu à signaler, une demande sur vos données :{" "}
            <a className={LINK} href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            . Nous répondons sous un mois au plus.
          </p>
        </Section>
      </div>
    </article>
  );
}
