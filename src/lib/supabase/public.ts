import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Client anonyme, sans cookie ni session : pour lire les contenus publics du site dans des
 * fonctions mises en cache (identiques pour tous les visiteurs). La RLS ne laisse voir que ce
 * qui est publié.
 */
export const createPublicClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
