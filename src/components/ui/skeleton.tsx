import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("shimmer rounded-lg bg-line", className)}
      {...props}
    />
  );
}

export { Skeleton };
