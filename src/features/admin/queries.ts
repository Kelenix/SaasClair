import "server-only";
import { cache } from "react";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { requireSuperAdmin } from "./guard";

// Lectures de l'espace administrateur : chacune revérifie l'accès (et la RLS filtre en base).

/** Tous les profils (clients et administrateurs), du plus récent au plus ancien. */
export const getAdminProfiles = cache(async () => {
  const { supabase } = await requireSuperAdmin();
  // Lecture par pages : le serveur coupe chaque réponse à 1 000 lignes (fetch-all.ts).
  const { error } = await supabase.from("profiles").select("id").limit(1);
  if (error) throw new Error("Lecture des profils impossible");
  return fetchAll(
    (from, to) =>
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    5000,
  );
});

/** Projets des clients (site suivi, étape de configuration), indexés par propriétaire. */
export const getAdminProjects = cache(async () => {
  const { supabase } = await requireSuperAdmin();
  const data = await fetchAll(
    (from, to) =>
      supabase
        .from("projects")
        .select("owner_id, site_url, script_detected_at, stripe_connected_at")
        .order("owner_id")
        .range(from, to),
    20_000,
  );
  return Object.fromEntries(data.map((project) => [project.owner_id, project]));
});

export async function getNewsletterSubscribers() {
  const { supabase } = await requireSuperAdmin();
  return fetchAll(
    (from, to) =>
      supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    10_000,
  );
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
