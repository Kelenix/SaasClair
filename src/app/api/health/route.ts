import { connection, type NextRequest } from "next/server";
import packageJson from "../../../../package.json";

/**
 * Sonde de santé.
 * - `/api/health` : l'application répond (utilisée par Docker et le déploiement).
 * - `/api/health?complet=1` : vérifie aussi que l'authentification et la base Supabase
 *   répondent (surveillance de disponibilité). Ne renvoie aucune donnée sensible.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("complet") !== "1") {
    return Response.json({ status: "ok" });
  }
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const check = async (path: string) => {
    const started = performance.now();
    try {
      const response = await fetch(`${url}${path}`, {
        headers: { apikey: key ?? "" },
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });
      return { ok: response.ok, ms: Math.round(performance.now() - started) };
    } catch {
      return { ok: false, ms: Math.round(performance.now() - started) };
    }
  };
  const [auth, database] = await Promise.all([
    check("/auth/v1/health"),
    check("/rest/v1/faq_items?select=id&limit=1"),
  ]);
  const ok = auth.ok && database.ok;
  return Response.json(
    { status: ok ? "ok" : "degrade", version: packageJson.version, auth, database },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
