"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

// reducedMotion="user" : si le système demande moins d'animations, Motion ne garde que les fondus.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
