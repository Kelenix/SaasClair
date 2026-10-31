"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex max-w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto rounded-full bg-sand p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap text-slate transition-[color,background-color,box-shadow,scale] duration-200 ease-spring outline-none hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-forest data-[state=active]:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "outline-none data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
