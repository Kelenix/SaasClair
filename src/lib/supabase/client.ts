import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Client Supabase du navigateur (clé publique « anon », soumise à la RLS). */
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
