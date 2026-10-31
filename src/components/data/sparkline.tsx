"use client";

import { useId } from "react";
import { m } from "motion/react";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

type SparklineProps = {
  data: number[];
  /** emerald : croissance · gold : attention */
  tone?: "emerald" | "gold";
  className?: string;
  label: string;
};

const WIDTH = 120;
const HEIGHT = 36;

export function toPoints(data: number[], width = WIDTH, height = HEIGHT) {
  const min = Math.min(...data);
  const range = Math.max(...data) - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  return data.map(
    (value, index) => [index * step, height - ((value - min) / range) * height] as const,
  );
}

/**
 * Mini-courbe qui se trace de gauche à droite à son apparition. Le tracé est révélé par un
 * masque qui s'élargit (scaleX) : animation de transformation pure, trait toujours net.
 */
export function Sparkline({ data, tone = "emerald", className, label }: SparklineProps) {
  const gradientId = useId();
  const clipId = useId();
  const points = toPoints(data);
  const line = points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const color = tone === "emerald" ? "var(--emerald)" : "var(--gold)";

  return (
    <m.svg
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      viewBox={`0 -3 ${WIDTH} ${HEIGHT + 6}`}
      className={cn("h-10 w-full overflow-visible", className)}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id={clipId}>
          <m.rect
            x={-4}
            y={-4}
            width={WIDTH + 8}
            height={HEIGHT + 8}
            style={{ originX: 0 }}
            variants={{
              hidden: { scaleX: 0 },
              show: { scaleX: 1, transition: { duration: DURATION.data * 1.2, ease: EASE_OUT } },
            }}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={`${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </m.svg>
  );
}
