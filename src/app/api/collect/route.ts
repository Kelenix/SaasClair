import { NextResponse, type NextRequest } from "next/server";
import { MAX_PAYLOAD_BYTES, parsePayload, toEvent } from "@/features/collect/payload";
import { createServiceClient } from "@/lib/supabase/service";

// Réception des visites envoyées par le script de collecte (public/s.js), depuis les sites des
// clients : ouvert à toutes les origines, aucune donnée renvoyée. ADR-023.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor/i;

const reply = (status = 204) => new NextResponse(null, { status, headers: CORS });

export const OPTIONS = () => reply();

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PAYLOAD_BYTES) return reply(413);
  // Robots et outils de mesure : ignorés, sans erreur.
  if (BOT.test(request.headers.get("user-agent") ?? "")) return reply();

  const payload = parsePayload(await request.text());
  if (!payload) return reply(400);

  const service = createServiceClient();
  if (!service) return reply(503);

  const { data: project } = await service
    .from("projects")
    .select("id, site_url, script_detected_at")
    .eq("site_key", payload.s)
    .maybeSingle();
  if (!project) return reply(404);

  const event = toEvent(payload, project.site_url);
  if (!event) return reply(422);

  const { error } = await service.from("events").insert({ ...event, project_id: project.id });
  if (error) return reply(500);

  // Première visite reçue : le script est installé (détection réelle, plus de simulation).
  if (!project.script_detected_at) {
    await service
      .from("projects")
      .update({ script_detected_at: new Date().toISOString() })
      .eq("id", project.id)
      .is("script_detected_at", null);
  }
  return reply();
}
