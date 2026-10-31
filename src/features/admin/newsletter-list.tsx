"use client";

import { useMemo, useState, useTransition } from "react";
import { m } from "motion/react";
import { toast } from "sonner";
import { Inbox, Search, Trash2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cascade, fadeUp } from "@/lib/motion";
import { deleteSubscriber, setSubscribed } from "./newsletter-actions";

type Subscriber = {
  id: string;
  email: string;
  source: string;
  created_at: string;
  unsubscribed_at: string | null;
};

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const PAGE_SIZE = 50;

export function NewsletterList({ subscribers }: { subscribers: Subscriber[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "unsubscribed" | "all">("active");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return subscribers.filter(
      (item) =>
        (!needle || item.email.includes(needle)) &&
        (filter === "all" || (filter === "active" ? !item.unsubscribed_at : item.unsubscribed_at)),
    );
  }, [subscribers, query, filter]);

  const run = (action: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.message ?? "Action impossible.");
    });

  const active = subscribers.filter((item) => !item.unsubscribed_at).length;

  return (
    <>
      <Card className="mb-4 flex flex-col gap-3 p-4 @3xl:flex-row @3xl:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Rechercher un abonné</span>
          <Icon
            icon={Search}
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un email…"
            className="h-11 pl-10"
          />
        </label>
        <Segmented
          label="Filtrer les abonnés"
          pillId="newsletter-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: "Abonnés", count: active },
            { value: "unsubscribed", label: "Désinscrits", count: subscribers.length - active },
            { value: "all", label: "Tous", count: subscribers.length },
          ]}
        />
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <StateMessage
            icon={Inbox}
            title="Personne dans cette liste."
            description="Les inscriptions arrivent par le formulaire du pied de page du site."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <m.ul className="divide-y divide-line" variants={cascade} initial="hidden" animate="show">
            {filtered.slice(0, limit).map((item) => (
              <m.li
                key={item.id}
                variants={fadeUp}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{item.email}</span>
                  <span className="block text-xs text-slate">
                    Inscrit le {DATE.format(new Date(item.created_at))} · {item.source}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {item.unsubscribed_at ? (
                    <>
                      <Badge>Désinscrit</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => run(() => setSubscribed(item.id, true), "Réinscrit.")}
                      >
                        Réinscrire
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => run(() => setSubscribed(item.id, false), "Désinscrit.")}
                    >
                      Désinscrire
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    aria-label={`Supprimer ${item.email}`}
                    className="text-danger hover:bg-danger/5"
                    onClick={() => {
                      if (window.confirm(`Effacer définitivement ${item.email} ?`)) {
                        run(() => deleteSubscriber(item.id), "Abonné effacé.");
                      }
                    }}
                  >
                    <Icon icon={Trash2} anim="wiggle" className="size-4" />
                  </Button>
                </span>
              </m.li>
            ))}
          </m.ul>
        </Card>
      )}
      {filtered.length > limit && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
            Afficher plus
          </Button>
        </div>
      )}
    </>
  );
}
