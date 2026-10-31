"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { Sparkline } from "@/components/data/sparkline";
import { Cascade, CascadeItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Kpi } from "../demo-data";

const TONE = {
  good: { badge: "growth", icon: ArrowUpRight, line: "emerald" },
  watch: { badge: "attention", icon: ArrowDownRight, line: "gold" },
  neutral: { badge: "neutral", icon: Minus, line: "emerald" },
} as const;

/** Indicateurs clés : compteur animé, variation et mini-courbe. */
export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <Cascade className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
      {kpis.map((kpi) => {
        const tone = TONE[kpi.isGood === null ? "neutral" : kpi.isGood ? "good" : "watch"];
        return (
          <CascadeItem key={kpi.id}>
            <Card interactive className="flex h-full flex-col gap-1 p-5">
              <p className="text-[13px] font-medium text-slate">{kpi.label}</p>
              <AnimatedNumber
                value={kpi.value}
                format={kpi.format}
                className="font-serif text-[32px] leading-tight font-semibold text-forest"
              />
              <Badge tone={tone.badge} pulse={kpi.isGood === false}>
                <Icon icon={tone.icon} className="size-3.5" />
                {kpi.delta}
              </Badge>
              <Sparkline
                key={kpi.trend.join()}
                data={kpi.trend}
                tone={tone.line}
                label={`Évolution : ${kpi.label}`}
                className="mt-auto pt-3"
              />
            </Card>
          </CascadeItem>
        );
      })}
    </Cascade>
  );
}
