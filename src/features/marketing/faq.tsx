import Link from "next/link";
import { ArrowRight, ChevronDown, Clock, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { getPublishedFaq } from "@/features/site-content/queries";

// Les réponses aux inquiétudes les plus courantes, visibles sans ouvrir une question.
const REASSURANCES = [
  { icon: Clock, title: "5 minutes", detail: "sans développeur" },
  { icon: Lock, title: "Jamais modifié", detail: "votre Stripe est seulement lu" },
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
              Essayer 7 jours gratuitement <Icon icon={ArrowRight} anim="nudge" />
            </Link>
          </Button>
        </Reveal>
        <Reveal className="rounded-card border border-line bg-white px-6 py-2 shadow-card sm:px-8 lg:self-start">
          {/* <details> natif : les réponses sont dans la page envoyée aux moteurs et aux IA
              (un accordéon JavaScript ne les écrit qu'à l'ouverture). Une seule ouverte à la fois. */}
          {faq.map((item) => (
            <details
              key={item.id}
              name="questions-frequentes"
              className="group border-b border-line last:border-b-0"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink [&::-webkit-details-marker]:hidden">
                <h3 className="font-sans text-base font-semibold text-forest">{item.question}</h3>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sand transition-[rotate,background-color] duration-300 ease-spring group-open:rotate-180 group-hover:bg-emerald-tint motion-reduce:transition-none">
                  <ChevronDown className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="disclosure-in pb-5 text-[15px] text-slate">{item.answer}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
