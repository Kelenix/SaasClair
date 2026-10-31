import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-line bg-white px-4 text-base text-ink transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-slate/70 hover:border-slate/40 focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-sand disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-4 aria-invalid:ring-danger/10 md:text-[15px]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
