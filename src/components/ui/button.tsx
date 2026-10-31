import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// Boutons pilule du brand kit. Survol : léger soulèvement ; clic : contraction avec ressort.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[translate,scale,background-color,border-color,color,box-shadow] duration-200 ease-spring outline-none select-none hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-colors motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        primary: "bg-forest text-cream hover:bg-forest-deep hover:shadow-lift",
        secondary: "border-[1.5px] border-forest bg-transparent text-forest hover:bg-forest/5",
        positive: "bg-emerald text-forest-deep hover:shadow-lift hover:brightness-105",
        ghost: "text-forest hover:bg-forest/6",
        inverse: "bg-cream text-forest hover:bg-white hover:shadow-lift",
        link: "rounded-md px-0! text-forest underline-offset-4 hover:translate-y-0 hover:underline",
      },
      size: {
        sm: "h-11 px-5 text-sm",
        md: "h-12 px-6 text-[15px]",
        lg: "h-14 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
