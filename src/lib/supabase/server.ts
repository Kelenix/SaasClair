import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";

/** Client Supabase côté serveur : lit et écrit la session dans les cookies de la requête. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component (cookies en lecture seule) : le proxy rafraîchit la session.
          }
        },
      },
    },
  );
}

/** Utilisateur connecté, vérifié auprès de Supabase (jamais déduit du seul cookie). */
export async function getUser() {
  // La vérification compare l'heure courante à l'expiration de la session : rendu à la requête.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
