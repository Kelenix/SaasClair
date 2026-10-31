import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Client avec la clé de service : contourne la RLS. Réservé au serveur, pour les écritures que
 * personne ne doit pouvoir faire depuis un navigateur (visites reçues par /api/collect).
 * Null si la clé est absente.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
