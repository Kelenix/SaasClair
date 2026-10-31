import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { getAboutPage } from "@/features/site-content/queries";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPage();
  return {
    title: "À propos",
    description: page?.intro || undefined,
    alternates: { canonical: "/a-propos" },
  };
}

/** Page « À propos », rédigée depuis l'espace administrateur. */
export default async function AboutPage() {
  const page = await getAboutPage();
  if (!page) notFound();
  const paragraphs = page.body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-10 sm:py-16">
      <Reveal>
        <p className="eyebrow">À propos</p>
        <h1 className="mb-5 text-[36px] leading-tight sm:text-[48px]">{page.title}</h1>
        {page.intro && <p className="mb-8 text-lg text-slate">{page.intro}</p>}
      </Reveal>
      <Reveal className="space-y-5 text-[17px] leading-relaxed text-ink">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </Reveal>
      <div className="mt-10">
        <Button asChild size="lg">
          <Link href="/inscription">
            Essayer 7 jours gratuitement <Icon icon={ArrowRight} anim="nudge" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
