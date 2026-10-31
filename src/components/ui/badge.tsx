import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border border-line bg-white text-forest",
        growth: "bg-emerald-tint text-emerald-ink",
        // Or : attire l'œil sans alarmer (clients à risque, alertes).
        attention: "bg-gold-tint text-gold-ink",
        danger: "bg-danger-tint text-danger",
        brand: "bg-forest text-cream",
      },
      pulse: { true: "pulse-soft" },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, pulse, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, pulse }), className)} {...props} />;
}
