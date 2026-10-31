"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Save } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveAboutPage } from "./content-actions";

const FIELD =
  "w-full rounded-xl border border-line bg-white px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition-[border-color,box-shadow] focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15";

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-xs font-normal text-slate tabular-nums">
      {value.length} / {max}
    </span>
  );
}

/** Page « À propos » : titre, introduction et texte (un paragraphe par ligne vide). */
export function AboutForm({
  initial,
}: {
  initial: { title: string; intro: string; body: string; is_published: boolean } | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [intro, setIntro] = useState(initial?.intro ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [isPending, startTransition] = useTransition();

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveAboutPage({ title, intro, body, isPublished });
      if (result.ok) toast.success("Page À propos mise à jour sur le site.");
      else toast.error(result.message);
    });
  };

  return (
    <Card>
      <form onSubmit={save} className="grid gap-5">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          <span className="flex justify-between gap-3">
            Titre <Counter value={title} max={120} />
          </span>
          <Input
            value={title}
            maxLength={120}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          <span className="flex justify-between gap-3">
            Introduction <Counter value={intro} max={400} />
          </span>
          <textarea
            value={intro}
            maxLength={400}
            rows={3}
            onChange={(event) => setIntro(event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          <span className="flex justify-between gap-3">
            Texte <Counter value={body} max={8000} />
          </span>
          <textarea
            value={body}
            maxLength={8000}
            rows={12}
            onChange={(event) => setBody(event.target.value)}
            className={FIELD}
          />
          <span className="text-xs font-normal text-slate">
            Laissez une ligne vide entre deux paragraphes.
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <label className="flex items-center gap-3 text-sm font-semibold text-ink">
            <Switch
              checked={isPublished}
              onCheckedChange={setIsPublished}
              aria-label="Page publiée"
            />
            Page publiée (lien dans le pied de page)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/a-propos" target="_blank" rel="noreferrer">
                <Icon icon={ExternalLink} anim="nudge" /> Voir la page
              </Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              <Icon icon={Save} anim="pop" /> {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
