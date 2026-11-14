import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { connection } from "next/server";
import type { Database } from "./database.types";

/**
 * Cookies de session illisibles par le JavaScript de la page (httpOnly) : même si un script
 * malveillant s'y glissait, il ne pourrait pas emporter la session (audit, lot A7). Seul le
 * serveur lit et écrit la session, y compris pour démarrer Google et GitHub (auth/actions.ts).
 */
export const SESSION_COOKIE_OPTIONS = { httpOnly: true } as const;

/** Client Supabase côté serveur : lit et écrit la session dans les cookies de la requête. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
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

/**
 * Utilisateur connecté, vérifié auprès de Supabase (jamais déduit du seul cookie). Une seule
 * vérification par requête : la mise en page, la page et chaque bloc de chiffres la partagent
 * (avant, chacun la refaisait, un aller-retour de plus à chaque fois).
 */
export const getUser = cache(async () => {
  // La vérification compare l'heure courante à l'expiration de la session : rendu à la requête.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/**
 * Projet du compte connecté (la ligne entière), lu une seule fois par requête et partagé par la
 * mise en page, les revenus, les visites, le tunnel et les insights.
 */
export const getOwnProject = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("owner_id", user.id).maybeSingle();
  return data;
});
