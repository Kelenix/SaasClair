import { BellRing, MailCheck, MessageSquareText, type LucideIcon } from "lucide-react";
import { Icon, type IconAnimation } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { Cascade, CascadeItem, Reveal } from "@/components/motion/reveal";
import { formatEuro } from "@/lib/format";
import { NADIA, RETENTION_POINTS } from "./content";

const POINT_ICONS: { icon: LucideIcon; anim: IconAnimation }[] = [
  { icon: BellRing, anim: "wiggle" },
  { icon: MessageSquareText, anim: "tilt" },
  { icon: MailCheck, anim: "bounce" },
];

export function ChurnSection() {
  return (
    <section className="relative overflow-hidden bg-forest py-12 text-cream sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-56 -left-40 size-[560px] rounded-full border-[70px] border-emerald/12"
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-10 lg:grid-cols-2 lg:gap-12">
        <Reveal>
          <p className="eyebrow text-gold!">Le vrai coût du churn</p>
          <h2 className="mb-5 text-[32px] text-cream sm:text-[40px]">
            Nadia perd 7 % de ses clients chaque mois. Elle ne sait pas lesquels.
          </h2>
          <p className="mb-8 max-w-md text-[17px] text-cream/80">
            Son SaaS fait {formatEuro(NADIA.mrr)} de revenu mensuel. Chaque mois, des clients
            résilient sans prévenir. Elle le découvre quand c&apos;est trop tard.
          </p>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-cream/15 bg-white/5 p-6">
              <dt className="text-sm text-cream/70">Revenu perdu chaque mois</dt>
              <dd className="mt-1 font-serif text-[40px] leading-tight font-semibold text-gold">
                <AnimatedNumber value={NADIA.lostPerMonth} format="euro" />
              </dd>
            </div>
            <div className="rounded-card border border-cream/15 bg-white/5 p-6">
              <dt className="text-sm text-cream/70">Sur une année</dt>
              <dd className="mt-1 font-serif text-[40px] leading-tight font-semibold text-cream">
                <AnimatedNumber value={NADIA.lostPerYear} format="euro" />
              </dd>
            </div>
          </dl>
        </Reveal>

        <div>
          <Reveal>
            <p className="mb-6 font-serif text-2xl leading-snug font-semibold text-cream sm:text-[28px]">
              Le churn est mesurable. Et il se répare.
            </p>
          </Reveal>
          <Cascade className="space-y-4">
            {RETENTION_POINTS.map((point, index) => (
              <CascadeItem key={point.title}>
                <div className="flex gap-4 rounded-card bg-cream p-5 text-ink" data-icon-trigger>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
                    <Icon icon={POINT_ICONS[index].icon} anim={POINT_ICONS[index].anim} />
                  </span>
                  <div>
                    <p className="font-semibold text-forest">{point.title}</p>
                    <p className="text-[15px] text-slate">{point.text}</p>
                  </div>
                </div>
              </CascadeItem>
            ))}
          </Cascade>
          <Reveal className="mt-6 rounded-card border border-emerald/40 bg-emerald/10 p-5">
            <p className="text-[15px] text-cream/90">
              Retenir 1 client à risque sur 3, c&apos;est{" "}
              <strong className="font-serif text-xl text-emerald">
                ≈ {formatEuro(NADIA.savedIfOneInThree)}
              </strong>{" "}
              de revenu gardé chaque mois.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
