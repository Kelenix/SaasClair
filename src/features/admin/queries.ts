import "server-only";
import { cache } from "react";
import { requireSuperAdmin } from "./guard";

// Lectures de l'espace administrateur : chacune revérifie l'accès (et la RLS filtre en base).

/** Tous les profils (clients et administrateurs), du plus récent au plus ancien. */
export const getAdminProfiles = cache(async () => {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error("Lecture des profils impossible");
  return data;
});

/** Projets des clients (site suivi, étape de configuration), indexés par propriétaire. */
export const getAdminProjects = cache(async () => {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase
    .from("projects")
    .select("owner_id, site_url, script_detected_at, stripe_connected_at");
  return Object.fromEntries((data ?? []).map((project) => [project.owner_id, project]));
});

export async function getNewsletterSubscribers() {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);
  return data ?? [];
}

export async function getAdminFaq() {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase.from("faq_items").select("*").order("position");
  return data ?? [];
}

export async function getAdminTestimonials() {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase.from("testimonials").select("*").order("position");
  return data ?? [];
}

export async function getAdminAboutPage() {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase
    .from("site_pages")
    .select("*")
    .eq("slug", "a-propos")
    .maybeSingle();
  return data;
}

export async function getAdminSiteSettings() {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

export async function getAuditLog(limit = 40) {
  const { supabase } = await requireSuperAdmin();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export type SystemStats = {
  database_size: number;
  postgres_version: string;
  migrations: string[];
  tables: Record<string, number>;
};

/** État de la base, avec le temps de réponse mesuré. */
export async function getSystemStats() {
  const { supabase } = await requireSuperAdmin();
  const started = performance.now();
  const { data, error } = await supabase.rpc("admin_system_stats");
  return {
    stats: (data as SystemStats | null) ?? null,
    databaseMs: Math.round(performance.now() - started),
    databaseOk: !error,
  };
}
