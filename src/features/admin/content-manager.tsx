"use client";

import { useState, useTransition } from "react";
import { m } from "motion/react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cascade, fadeUp } from "@/lib/motion";
import {
  deleteContentItem,
  moveContentItem,
  saveContentItem,
  setContentPublished,
  type ContentKind,
} from "./content-actions";

export type ContentField = {
  name: string;
  label: string;
  max: number;
  multiline?: boolean;
  optional?: boolean;
};

type Item = { id: string; is_published: boolean } & Record<string, unknown>;

const FIELD_CLASS =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] focus-visible:border-emerald-ink focus-visible:ring-4 focus-visible:ring-emerald/15";

function ItemDialog({
  kind,
  fields,
  item,
  title,
  open,
  onOpenChange,
}: {
  kind: ContentKind;
  fields: ContentField[];
  item: Item | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.name, String(item?.[field.name] ?? "")])),
  );
  const [isPending, startTransition] = useTransition();

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveContentItem(kind, item?.id ?? null, values);
      if (result.ok) {
        toast.success(item ? "Modifications publiées sur le site." : "Ajouté au site.");
        onOpenChange(false);
      } else toast.error(result.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Visible sur le site vitrine dès l&apos;enregistrement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4">
          {fields.map((field) => {
            const value = values[field.name] ?? "";
            const id = `${kind}-${field.name}`;
            return (
              <label
                key={field.name}
                htmlFor={id}
                className="grid gap-1.5 text-sm font-semibold text-ink"
              >
                <span className="flex justify-between gap-3">
                  {field.label}
                  <span className="text-xs font-normal text-slate tabular-nums">
                    {value.length} / {field.max}
                  </span>
                </span>
                {field.multiline ? (
                  <textarea
                    id={id}
                    value={value}
                    maxLength={field.max}
                    rows={5}
                    required={!field.optional}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    className={`${FIELD_CLASS} py-3 leading-relaxed font-normal`}
                  />
                ) : (
                  <Input
                    id={id}
                    value={value}
                    maxLength={field.max}
                    required={!field.optional}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                    className="font-normal"
                  />
                )}
              </label>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Liste modifiable d'un contenu du site : ajout, modification, publication, ordre, suppression. */
export function ContentManager({
  kind,
  items,
  fields,
  singular,
  addLabel,
  emptyText,
  titleKey,
  detailKey,
}: {
  kind: ContentKind;
  items: Item[];
  fields: ContentField[];
  singular: string;
  addLabel: string;
  emptyText: string;
  /** Champs affichés dans la liste (titre, puis détail). */
  titleKey: string;
  detailKey: string;
}) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const published = items.filter((item) => item.is_published).length;

  const openEditor = (item: Item | null) => {
    setEditing(item);
    setDialogKey((key) => key + 1);
    setIsDialogOpen(true);
  };
  const run = (action: () => Promise<{ ok: boolean; message?: string }>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.message ?? "Action impossible.");
      else if (success) toast.success(success);
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate" role="status">
          {items.length} au total · {published} publié{published > 1 ? "s" : ""} sur le site
        </p>
        <Button onClick={() => openEditor(null)}>
          <Icon icon={Plus} anim="pop" /> {addLabel}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <StateMessage
            icon={Inbox}
            title={emptyText}
            description="Ajoutez le premier : il apparaîtra sur le site vitrine aussitôt."
          />
        </Card>
      ) : (
        <m.ul className="space-y-3" variants={cascade} initial="hidden" animate="show">
          {items.map((item, index) => {
            const title = String(item[titleKey] ?? "");
            const detail = String(item[detailKey] ?? "");
            return (
              <m.li key={item.id} variants={fadeUp}>
                <Card className="flex flex-col gap-4 p-5 @3xl:flex-row @3xl:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{title}</span>
                      {!item.is_published && <Badge>Masqué</Badge>}
                    </p>
                    <p className="line-clamp-2 text-sm text-slate">{detail}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <label className="mr-2 flex items-center gap-2 text-xs font-semibold text-slate">
                      <Switch
                        checked={item.is_published}
                        disabled={isPending}
                        onCheckedChange={(checked) =>
                          run(
                            () => setContentPublished(kind, item.id, checked),
                            checked ? "Publié." : "Masqué du site.",
                          )
                        }
                        aria-label={`Publier : ${title}`}
                      />
                      Publié
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending || index === 0}
                      onClick={() => run(() => moveContentItem(kind, item.id, "up"))}
                      aria-label={`Monter : ${title}`}
                    >
                      <Icon icon={ArrowUp} anim="bounce" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending || index === items.length - 1}
                      onClick={() => run(() => moveContentItem(kind, item.id, "down"))}
                      aria-label={`Descendre : ${title}`}
                    >
                      <Icon icon={ArrowDown} anim="bounce" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditor(item)}
                      aria-label={`Modifier : ${title}`}
                    >
                      <Icon icon={Pencil} anim="tilt" className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => {
                        if (
                          window.confirm(`Supprimer ce ${singular} ? Cette action est définitive.`)
                        ) {
                          run(() => deleteContentItem(kind, item.id), "Supprimé.");
                        }
                      }}
                      aria-label={`Supprimer : ${title}`}
                      className="text-danger hover:bg-danger/5"
                    >
                      <Icon icon={Trash2} anim="wiggle" className="size-4" />
                    </Button>
                  </div>
                </Card>
              </m.li>
            );
          })}
        </m.ul>
      )}

      <ItemDialog
        key={dialogKey}
        kind={kind}
        fields={fields}
        item={editing}
        title={editing ? `Modifier le ${singular}` : addLabel}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
