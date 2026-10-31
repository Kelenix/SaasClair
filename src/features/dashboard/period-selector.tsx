"use client";

import { useId, useState } from "react";
import { m } from "motion/react";
import { CalendarDays, SlidersHorizontal } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PERIOD_LABELS, PERIODS, periodFromRange, type Period } from "./period";
import { usePeriod } from "./period-context";

function CustomRangeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setPeriod } = usePeriod();
  const id = useId();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const isValid = Boolean(from && to && from < to);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Période personnalisée</DialogTitle>
          <DialogDescription>
            Choisissez deux dates : tout l&apos;écran se met à jour.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-from`} className="flex flex-col gap-1.5 text-sm font-semibold">
            Du
            <Input
              id={`${id}-from`}
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label htmlFor={`${id}-to`} className="flex flex-col gap-1.5 text-sm font-semibold">
            Au
            <Input
              id={`${id}-to`}
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={!isValid}
            onClick={() => {
              setPeriod(periodFromRange(from, to));
              onOpenChange(false);
            }}
          >
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Segments({ onPick }: { onPick?: () => void }) {
  const { period, setPeriod } = usePeriod();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const choose = (next: Period) => {
    setPeriod(next);
    onPick?.();
  };

  return (
    <>
      <div
        role="group"
        aria-label="Période"
        className="flex flex-wrap gap-1 rounded-full bg-sand p-1"
      >
        {PERIODS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={period === option}
            onClick={() => choose(option)}
            className="relative h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap text-slate transition-colors hover:text-forest aria-pressed:text-forest"
          >
            {period === option && (
              <m.span
                layoutId={onPick ? "period-pill-sheet" : "period-pill"}
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-white shadow-card"
              />
            )}
            <span className="relative">{PERIOD_LABELS[option]}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsCustomOpen(true)}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-slate transition-colors hover:text-forest"
        >
          <Icon icon={CalendarDays} anim="bounce" className="size-4" /> Personnalisé
        </button>
      </div>
      <CustomRangeDialog open={isCustomOpen} onOpenChange={setIsCustomOpen} />
    </>
  );
}

/** Sélecteur de période global : segments sur grand écran, panneau qui glisse du bas ailleurs. */
export function PeriodSelector() {
  const { period } = usePeriod();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <div className="hidden xl:block">
        <Segments />
      </div>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className={cn("border-line bg-white px-4 xl:hidden")}
          >
            <Icon icon={SlidersHorizontal} anim="tilt" className="size-4" />
            {PERIOD_LABELS[period]}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Période</SheetTitle>
          </SheetHeader>
          <SheetBody className="pb-8">
            <Segments onPick={() => setIsSheetOpen(false)} />
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
