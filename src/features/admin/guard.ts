import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Accès réservé au super administrateur : vérifié côté serveur à chaque page et action, en plus
 * des politiques RLS de la base. Un autre compte est renvoyé vers son tableau de bord. Mémorisé
 * le temps d'une requête : la mise en page et la page ne vérifient qu'une fois.
 */
export const requireSuperAdmin = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/connexion?next=/admin");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") redirect("/app");
  return { user, supabase, profile };
});

/** Version pour les actions serveur : renvoie null au lieu de rediriger. */
export async function superAdminOrNull() {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  return isAdmin ? { user, supabase } : null;
}

type AdminClient = NonNullable<Awaited<ReturnType<typeof superAdminOrNull>>>["supabase"];

/** Trace une action du super administrateur dans le journal d'activité. */
export async function logAdminAction(
  supabase: AdminClient,
  action: string,
  target: string | null,
  details?: Record<string, unknown>,
) {
  await supabase
    .from("admin_audit_log")
    .insert({ action, target, details: (details ?? null) as never });
}
