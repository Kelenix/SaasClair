import { Quote } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Cascade, CascadeItem, Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { getPublishedTestimonials } from "@/features/site-content/queries";

const initialsOf = (name: string) =>
  name
    .split(/[s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

/** Témoignages publiés depuis l'espace administrateur ; la section disparaît s'il n'y en a aucun. */
export async function Testimonials() {
  const testimonials = await getPublishedTestimonials();
  if (testimonials.length === 0) return null;
  return (
    <section className="border-t border-line py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-10">
        <Reveal className="mb-8 max-w-2xl sm:mb-10">
          <p className="eyebrow">Ils ont arrêté de deviner</p>
          <h2 className="text-[32px] sm:text-[40px]">
            Des fondateurs qui savent enfin quoi faire.
          </h2>
        </Reveal>
        <Cascade
          className={`grid grid-cols-1 gap-5 ${testimonials.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
        >
          {testimonials.map((testimonial) => (
            <CascadeItem key={testimonial.id} className="h-full">
              <Card interactive className="flex h-full flex-col p-7" data-icon-trigger>
                <span className="mb-4 text-gold">
                  <Icon icon={Quote} anim="tilt" className="size-7" />
                </span>
                <blockquote className="mb-6 font-serif text-xl leading-snug text-forest">
                  « {testimonial.quote} »
                </blockquote>
                <div className="mt-auto flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-forest text-sm font-bold text-cream">
                    {initialsOf(testimonial.author)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{testimonial.author}</span>
                    <span className="block text-[13px] text-slate">{testimonial.role}</span>
                  </span>
                </div>
              </Card>
            </CascadeItem>
          ))}
        </Cascade>
      </div>
    </section>
  );
}
