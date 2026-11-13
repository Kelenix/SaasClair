import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Étape « Installer le script » : la première visite est-elle arrivée ? Interrogé toutes les
 * quelques secondes par la configuration (lecture seule, aucune page rechargée).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ detected: false }, { status: 401 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("script_detected_at, audit")
    .eq("owner_id", user.id)
    .maybeSingle();
  return NextResponse.json(
    {
      detected: Boolean(data?.script_detected_at),
      // Analyse du site faite en arrière-plan : la configuration ouvre l'onglet de la plateforme.
      technologies: (data?.audit as { technologies?: string[] } | null)?.technologies ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
