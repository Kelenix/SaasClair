"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { SITE_CONTENT_TAG } from "@/features/site-content/tags";
import { logAdminAction, superAdminOrNull } from "./guard";

type Result = { ok: true } | { ok: false; message: string };

const DENIED = "Action réservée au super administrateur.";
const SAVE_ERROR = "La modification n'a pas pu être enregistrée. Réessayez dans un instant.";

export type ContentKind = "faq" | "testimonial";

const TABLES = { faq: "faq_items", testimonial: "testimonials" } as const;

const schemas = {
  faq: z.object({
    question: z.string().trim().min(5, "La question est trop courte.").max(200),
    answer: z.string().trim().min(10, "La réponse est trop courte.").max(1200),
  }),
  testimonial: z.object({
    quote: z.string().trim().min(10, "Le témoignage est trop court.").max(600),
    author: z.string().trim().min(2, "Indiquez le nom.").max(80),
    role: z.string().trim().max(120),
  }),
};

/** Le site vitrine relit ses contenus tout de suite après une modification. */
function refreshSite() {
  updateTag(SITE_CONTENT_TAG);
  revalidatePath("/admin", "layout");
}

/** Crée (id absent) ou modifie un élément de la FAQ ou un témoignage. */
export async function saveContentItem(
  kind: ContentKind,
  id: string | null,
  input: unknown,
): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  const parsed = schemas[kind].safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? SAVE_ERROR };
  }
  const table = TABLES[kind];

  if (id) {
    if (!z.uuid().safeParse(id).success) return { ok: false, message: SAVE_ERROR };
    const { error } = await admin.supabase.from(table).update(parsed.data).eq("id", id);
    if (error) return { ok: false, message: SAVE_ERROR };
  } else {
    const { data: last } = await admin.supabase
      .from(table)
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await admin.supabase
      .from(table)
      .insert({ ...parsed.data, position: (last?.position ?? 0) + 1 } as never);
    if (error) return { ok: false, message: SAVE_ERROR };
  }
  await logAdminAction(admin.supabase, id ? `${kind}.modifie` : `${kind}.ajoute`, id);
  refreshSite();
  return { ok: true };
}

export async function setContentPublished(
  kind: ContentKind,
  id: string,
  isPublished: boolean,
): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  const { error } = await admin.supabase
    .from(TABLES[kind])
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, isPublished ? `${kind}.publie` : `${kind}.masque`, id);
  refreshSite();
  return { ok: true };
}

export async function deleteContentItem(kind: ContentKind, id: string): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  const { error } = await admin.supabase.from(TABLES[kind]).delete().eq("id", id);
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, `${kind}.supprime`, id);
  refreshSite();
  return { ok: true };
}

/** Échange la place d'un élément avec son voisin (ordre d'affichage sur le site). */
export async function moveContentItem(
  kind: ContentKind,
  id: string,
  direction: "up" | "down",
): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  const table = TABLES[kind];
  const { data: items } = await admin.supabase.from(table).select("id, position").order("position");
  const list = items ?? [];
  const index = list.findIndex((item) => item.id === id);
  const neighbour = list[direction === "up" ? index - 1 : index + 1];
  if (index < 0 || !neighbour) return { ok: true };
  // Positions renumérotées : l'échange reste juste même si deux éléments avaient la même place.
  const reordered = list.map((item) => item.id);
  [reordered[index], reordered[list.indexOf(neighbour)]] = [neighbour.id, id];
  const results = await Promise.all(
    reordered.map((itemId, position) =>
      admin.supabase
        .from(table)
        .update({ position: position + 1 })
        .eq("id", itemId),
    ),
  );
  if (results.some((result) => result.error)) return { ok: false, message: SAVE_ERROR };
  refreshSite();
  return { ok: true };
}

const aboutSchema = z.object({
  title: z.string().trim().min(2, "Le titre est trop court.").max(120),
  intro: z.string().trim().max(400),
  body: z.string().trim().max(8000),
  isPublished: z.boolean(),
});

export async function saveAboutPage(input: unknown): Promise<Result> {
  const admin = await superAdminOrNull();
  if (!admin) return { ok: false, message: DENIED };
  const parsed = aboutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? SAVE_ERROR };
  }
  const { error } = await admin.supabase.from("site_pages").upsert({
    slug: "a-propos",
    title: parsed.data.title,
    intro: parsed.data.intro,
    body: parsed.data.body,
    is_published: parsed.data.isPublished,
  });
  if (error) return { ok: false, message: SAVE_ERROR };
  await logAdminAction(admin.supabase, "page.a-propos.modifiee", "a-propos");
  refreshSite();
  return { ok: true };
}
