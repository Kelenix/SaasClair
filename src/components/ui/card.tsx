import * as React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & {
  /** Se soulève légèrement au survol (cartes cliquables). */
  interactive?: boolean;
};

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-card border border-line bg-card p-6 text-card-foreground shadow-card",
        interactive &&
          "transition-[translate,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-lift motion-reduce:hover:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}

export function CardEyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mb-2 eyebrow", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-xl", className)} {...props} />;
}
