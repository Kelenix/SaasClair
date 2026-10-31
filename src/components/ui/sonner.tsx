"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheck, Info, TriangleAlert, OctagonX, LoaderCircle } from "lucide-react";
import { Icon } from "@/components/brand/icon";

// Toasts du brand kit : pilule vert forêt, texte crème ; glissent puis disparaissent seuls.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      duration={4000}
      icons={{
        success: <Icon icon={CircleCheck} className="size-4 text-emerald" />,
        info: <Icon icon={Info} className="size-4 text-cream" />,
        warning: <Icon icon={TriangleAlert} className="size-4 text-gold" />,
        error: <Icon icon={OctagonX} className="size-4 text-gold" />,
        loading: <LoaderCircle className="size-4 animate-spin text-cream" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-full !border-0 !bg-forest !px-5 !py-3 !text-cream !shadow-float !font-sans !text-sm",
          description: "!text-cream/75",
          actionButton: "!rounded-full !bg-emerald !text-forest !font-semibold",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
