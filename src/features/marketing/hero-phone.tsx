"use client";

import { m } from "motion/react";
import { Bell, Filter, HeartHandshake, House, Wallet } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { formatEuro } from "@/lib/format";
import { DURATION, EASE_OUT, growY } from "@/lib/motion";
import { cn } from "@/lib/utils";

const WEEK = [42, 55, 48, 63, 58, 71, 86];

const TO_CONTACT = [
  { initials: "LB", name: "Lumen Bureau", mrr: 420 },
  { initials: "OF", name: "Orbe Formation", mrr: 290 },
  { initials: "VR", name: "Verso RH", mrr: 180 },
];

/** Version mobile de SaasClair, qui glisse à côté de la grande maquette. */
export function HeroPhone({ className }: { className?: string }) {
  return (
    <m.div
      initial={{ opacity: 0, x: 40, y: 20 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: DURATION.screen * 2, ease: EASE_OUT, delay: 1.1 }}
      className={className}
      aria-hidden
    >
      <div className="w-[236px] animate-[float_8s_ease-in-out_infinite] rounded-[38px] border-[7px] border-ink bg-cream p-3 shadow-float motion-reduce:animate-none">
        <div className="mb-3 flex items-center justify-between px-1 text-[10px] font-semibold text-ink">
          9:41
          <span className="h-4 w-16 rounded-full bg-ink" />
          <Icon icon={Bell} anim="wiggle" className="size-3" />
        </div>
        <p className="mb-2 px-1 text-[13px] font-semibold text-forest">Bonjour, Nadia</p>

        <div className="mb-3 rounded-2xl bg-forest p-3.5 text-cream">
          <p className="text-[10px] text-cream/70">Revenu mensuel</p>
          <AnimatedNumber
            value={25000}
            format="euro"
            className="font-serif text-2xl font-semibold"
          />
          <m.div className="mt-2 flex h-12 items-end gap-1.5" initial="hidden" animate="show">
            {WEEK.map((height, index) => (
              <m.span
                key={index}
                className={cn(
                  "flex-1 origin-bottom rounded-t-md",
                  index === WEEK.length - 1 ? "bg-gold" : "bg-emerald/80",
                )}
                style={{ height: `${height}%` }}
                variants={growY}
                custom={1.4 + index * 0.06}
              />
            ))}
          </m.div>
        </div>

        <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-[0.12em] text-slate uppercase">
          À relancer aujourd&apos;hui
        </p>
        <ul className="space-y-1.5">
          {TO_CONTACT.map((customer) => (
            <li
              key={customer.name}
              className="flex items-center justify-between rounded-xl bg-white px-2.5 py-2 text-[11px]"
            >
              <span className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-gold-tint text-[9px] font-bold text-gold-ink">
                  {customer.initials}
                </span>
                <span className="font-medium text-ink">{customer.name}</span>
              </span>
              <span className="font-semibold text-forest tabular-nums">
                {formatEuro(customer.mrr)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-around border-t border-line pt-2.5 text-slate">
          <Icon icon={House} className="size-4 text-forest" />
          <Icon icon={Filter} className="size-4" />
          <Icon icon={HeartHandshake} className="size-4" />
          <Icon icon={Wallet} className="size-4" />
        </div>
      </div>
    </m.div>
  );
}
