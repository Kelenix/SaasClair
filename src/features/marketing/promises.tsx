import { Compass, Filter, HeartHandshake, type LucideIcon } from "lucide-react";
import { Icon, type IconAnimation } from "@/components/brand/icon";
import { RiskMeter } from "@/components/data/risk-meter";
import { Cascade, CascadeItem, Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { PROMISES } from "./content";
import { GrowBar } from "@/components/data/grow-bar";

const ICONS: Record<(typeof PROMISES)[number]["id"], { icon: LucideIcon; anim: IconAnimation }> = {
  acquisition: { icon: Compass, anim: "spin" },
  conversion: { icon: Filter, anim: "bounce" },
  churn: { icon: HeartHandshake, anim: "pop" },
};

function AcquisitionVisual() {
  const channels = [
    ["SEO", 100],
    ["LinkedIn", 63],
    ["Direct", 42],
  ] as const;
  return (
    <ul className="space-y-2.5">
      {channels.map(([label, share], index) => (
        <li key={label} className="grid grid-cols-[72px_1fr] items-center gap-3 text-xs text-slate">
          {label}
          <GrowBar share={share} delay={index * 0.08} />
        </li>
      ))}
    </ul>
  );
}

function ConversionVisual() {
  const steps = [
    ["Visite", 100],
    ["Inscription", 38],
    ["Paiement", 9],
  ] as const;
  return (
    <ul className="space-y-2.5">
      {steps.map(([label, share], index) => (
        <li key={label} className="grid grid-cols-[72px_1fr] items-center gap-3 text-xs text-slate">
          {label}
          <GrowBar share={share} delay={index * 0.08} tone={index === 2 ? "gold" : "forest"} />
        </li>
      ))}
    </ul>
  );
}

function ChurnVisual() {
  const customers = [
    ["Lumen Bureau", 86],
    ["Orbe Formation", 72],
    ["Verso RH", 54],
  ] as const;
  return (
    <ul className="space-y-2.5">
      {customers.map(([name, score]) => (
        <li
          key={name}
          className="flex items-center justify-between gap-3 text-xs whitespace-nowrap text-slate"
        >
          {name}
          <RiskMeter score={score} className="w-24" />
        </li>
      ))}
    </ul>
  );
}

const VISUALS = {
  acquisition: AcquisitionVisual,
  conversion: ConversionVisual,
  churn: ChurnVisual,
};

export function Promises() {
  return (
    <section id="fonctionnalites" className="scroll-mt-20 border-t border-line py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-10">
        <Reveal className="mb-8 max-w-2xl sm:mb-10">
          <p className="eyebrow">Trois réponses, zéro tableau à décrypter</p>
          <h2 className="text-[32px] sm:text-[40px]">
            Les trois questions que vous vous posez chaque lundi.
          </h2>
        </Reveal>
        <Cascade className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PROMISES.map((promise) => {
            const Visual = VISUALS[promise.id];
            const { icon, anim } = ICONS[promise.id];
            return (
              <CascadeItem key={promise.id} className="h-full">
                <Card interactive className="flex h-full flex-col p-7" data-icon-trigger>
                  <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-emerald-tint text-emerald-ink">
                    <Icon icon={icon} anim={anim} className="size-6" />
                  </span>
                  <p className="mb-1 eyebrow">{promise.eyebrow}</p>
                  <h3 className="mb-3 text-2xl">{promise.title}</h3>
                  <p className="mb-6 text-[15px] text-slate">{promise.text}</p>
                  <div className="mt-auto rounded-xl bg-cream p-4">
                    <Visual />
                    <p className="mt-4 border-t border-line pt-3 text-[13px] font-semibold text-forest">
                      {promise.proof}
                    </p>
                  </div>
                </Card>
              </CascadeItem>
            );
          })}
        </Cascade>
      </div>
    </section>
  );
}
