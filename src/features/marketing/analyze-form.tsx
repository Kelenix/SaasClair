"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { normalizeSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

/**
 * Champ « Adresse de votre SaaS » → inscription. L'adresse voyage dans l'URL (?site=)
 * jusqu'à l'étape 0 de la configuration, où elle est déjà remplie.
 */
export function AnalyzeForm({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isDark = tone === "dark";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const site = normalizeSiteUrl(value);
    if (!site) {
      setError("Entrez l'adresse de votre site, par exemple monsaas.fr.");
      return;
    }
    router.push(`/inscription?site=${encodeURIComponent(site)}`);
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-xl">
      <label htmlFor={inputId} className="sr-only">
        Adresse de votre SaaS
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-[28px] border p-2 shadow-card transition-[border-color,box-shadow] duration-200 focus-within:ring-4 sm:flex-row sm:items-center sm:rounded-full",
          isDark
            ? "border-cream/15 bg-white/8 focus-within:ring-emerald/25"
            : "border-line bg-white focus-within:border-emerald-ink focus-within:ring-emerald/15",
          error && "border-danger! ring-4 ring-danger/10",
        )}
      >
        <span
          className={cn(
            "flex flex-1 items-center gap-3 pl-4",
            isDark ? "text-cream/60" : "text-slate",
          )}
        >
          <Icon icon={Globe} anim="spin" className="size-5 shrink-0" />
          <input
            id={inputId}
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="Adresse de votre SaaS"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "h-12 w-full min-w-0 bg-transparent text-base outline-none",
              isDark
                ? "text-cream placeholder:text-cream/70"
                : "text-ink placeholder:text-slate/70",
            )}
          />
        </span>
        <Button
          type="submit"
          variant={isDark ? "positive" : "primary"}
          size="md"
          className="w-full sm:w-auto"
        >
          Analyser mon SaaS
          <Icon icon={ArrowRight} anim="nudge" />
        </Button>
      </div>
      <p
        id={`${inputId}-error`}
        aria-live="polite"
        className={cn("mt-2 min-h-5 pl-5 text-sm", isDark ? "text-gold" : "text-danger")}
      >
        {error}
      </p>
    </form>
  );
}
