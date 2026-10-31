import Link from "next/link";
import { ArrowRight, Clock, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { getPublishedFaq } from "@/features/site-content/queries";

// Les réponses aux inquiétudes les plus courantes, visibles sans ouvrir une question.
const REASSURANCES = [
  { icon: Clock, title: "5 minutes", detail: "sans développeur" },
  { icon: Lock, title: "Lecture uniquement", detail: "de votre Stripe" },
  { icon: ShieldCheck, title: "Hébergé en UE", detail: "visiteurs anonymisés" },
  { icon: Trash2, title: "Vos données", detail: "supprimables à tout moment" },
] as const;

export async function Faq() {
  const faq = await getPublishedFaq();
  if (faq.length === 0) return null;
  return (
    <section className="border-t border-line py-12 sm:py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">Questions fréquentes</p>
          <h2 className="mb-6 text-[32px] sm:text-[40px]">
            Tout ce que vous voulez savoir avant d&apos;essayer.
          </h2>
          <ul className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {REASSURANCES.map((item) => (
              <li
                key={item.title}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3"
                data-icon-trigger
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-tint text-emerald-ink">
                  <Icon icon={item.icon} anim="pop" className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-forest">{item.title}</span>
                  <span className="block text-[13px] text-slate">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <Button asChild>
            <Link href="/inscription">
              Essayer 14 jours gratuitement <Icon icon={ArrowRight} anim="nudge" />
            </Link>
          </Button>
        </Reveal>
        <Reveal className="rounded-card border border-line bg-white px-6 py-2 shadow-card sm:px-8 lg:self-start">
          <Accordion type="single" collapsible>
            {faq.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="font-sans">{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
