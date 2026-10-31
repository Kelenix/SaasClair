"use client";

import { useId, useState } from "react";
import { m } from "motion/react";
import { ArrowUp, MessageCircleQuestion } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { answerQuestion, SUGGESTED_QUESTIONS, type Answer } from "./answers";

const THINKING_MS = 900;

/** Barre « Posez une question à vos données… » : la réponse arrive comme un insight rédigé. */
export function QuestionBar() {
  const inputId = useId();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setAsked(trimmed);
    setAnswer(null);
    setIsOpen(true);
    setQuestion("");
    setTimeout(() => setAnswer(answerQuestion(trimmed)), THINKING_MS);
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
        className="relative hidden min-w-0 flex-1 md:block"
      >
        <label htmlFor={inputId} className="sr-only">
          Posez une question à vos données
        </label>
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-emerald-ink">
          <Icon icon={MessageCircleQuestion} anim="wiggle" className="size-[18px]" />
        </span>
        <input
          id={inputId}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Posez une question à vos données…"
          className="h-11 w-full rounded-full border border-line bg-white pr-12 pl-11 text-[14px] text-ink transition-[border-color,box-shadow] outline-none placeholder:text-slate/80 focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15"
        />
        <button
          type="submit"
          aria-label="Poser la question"
          className="absolute inset-y-1 right-1 grid w-9 cursor-pointer place-items-center rounded-full bg-forest text-cream transition-transform active:scale-90"
        >
          <Icon icon={ArrowUp} anim="bounce" className="size-4" />
        </button>
      </form>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Poser une question à vos données"
      >
        <Icon icon={MessageCircleQuestion} anim="wiggle" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Vos données répondent</SheetTitle>
            <SheetDescription>
              {asked ? `« ${asked} »` : "Posez votre question en une phrase."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-5 pb-6">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                ask(question);
              }}
              className="md:hidden"
            >
              <input
                aria-label="Votre question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Pourquoi mes inscriptions ont baissé ?"
                className="h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none focus-visible:border-emerald-ink"
              />
            </form>

            {asked && !answer && (
              <p className="flex items-center gap-2 text-sm text-slate" role="status">
                <span
                  className="pulse-ring size-2 rounded-full bg-emerald text-emerald"
                  aria-hidden
                />
                Je regarde vos chiffres…
              </p>
            )}

            {answer && (
              <m.article
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.screen, ease: EASE_OUT }}
                className="rounded-2xl border-l-4 border-gold bg-cream p-5"
                aria-live="polite"
              >
                <p className="mb-3 font-serif text-xl leading-snug font-semibold text-forest">
                  {answer.title}
                </p>
                {answer.paragraphs.map((paragraph, index) => (
                  <m.p
                    key={paragraph}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + index * 0.25 }}
                    className="mb-2 text-[15px] text-ink"
                  >
                    {paragraph}
                  </m.p>
                ))}
                <p className="mt-3 text-xs text-slate">Calculé sur : {answer.basis}</p>
              </m.article>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-slate uppercase">
                Exemples
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    className="min-h-11 cursor-pointer rounded-full border border-line bg-white px-4 text-left text-[13px] text-forest transition-colors hover:border-forest/40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
