import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Liste déroulante native, au style du brand kit : clavier, mobile et lecteurs d'écran natifs. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative block", className)}>
      <select
        className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-white pr-10 pl-3.5 text-[14px] text-ink transition-[border-color,box-shadow] outline-none hover:border-slate/40 focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15 disabled:cursor-not-allowed disabled:opacity-60"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate"
      />
    </span>
  );
}
