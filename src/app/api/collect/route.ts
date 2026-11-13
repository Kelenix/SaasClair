import { NextResponse, type NextRequest } from "next/server";
import { MAX_PAYLOAD_BYTES, parsePayload, toEvent } from "@/features/collect/payload";
import { createRateLimiter } from "@/lib/rate-limit";
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

// Protections contre les fausses visites en masse (audit de sécurité, A2) : un vrai visiteur
// envoie quelques pages par minute ; un site, au plus quelques dizaines de milliers par heure.
const perVisitorIp = createRateLimiter({ limit: 120, windowMs: 60_000 });
const PROJECT_HOURLY_CAP = 50_000;
const projectHour = new Map<string, { hour: number; count: number }>();

function projectAllows(projectId: string, now = Date.now()) {
  const hour = Math.floor(now / 3_600_000);
  const current = projectHour.get(projectId);
  if (!current || current.hour !== hour) {
    projectHour.set(projectId, { hour, count: 1 });
    if (projectHour.size > 10_000) projectHour.clear();
    return true;
  }
  current.count += 1;
  return current.count <= PROJECT_HOURLY_CAP;
}

/** Corps lu au plus jusqu'à la limite, même sans en-tête Content-Length (envoi « chunked »). */
async function readLimited(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PAYLOAD_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

const reply = (status = 204) => new NextResponse(null, { status, headers: CORS });

export const OPTIONS = () => reply();

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PAYLOAD_BYTES) return reply(413);
  // Robots et outils de mesure : ignorés, sans erreur.
  if (BOT.test(request.headers.get("user-agent") ?? "")) return reply();
  // Adresse du visiteur, posée par Nginx (jamais enregistrée) : seulement pour freiner les abus.
  const ip = request.headers.get("x-real-ip") ?? "";
  if (ip && !perVisitorIp.take(ip)) return reply(429);

  const raw = await readLimited(request);
  if (raw === null) return reply(413);
  const payload = parsePayload(raw);
  if (!payload) return reply(400);

  const service = createServiceClient();
  if (!service) return reply(503);

  const { data: project } = await service
    .from("projects")
    .select("id, site_url, script_detected_at")
    .eq("site_key", payload.s)
    .maybeSingle();
  if (!project) return reply(404);
  if (!projectAllows(project.id)) return reply(429);

  const event = toEvent(payload, project.site_url);
  if (!event) return reply(422);

  const { error } = await service.from("events").insert({ ...event, project_id: project.id });
  if (error) return reply(500);

  // Projet sans adresse (étape passée) : il apprend celle de sa première visite, puis n'accepte
  // plus que ce site-là (toEvent refuse les autres).
  if (!project.site_url) {
    await service
      .from("projects")
      .update({ site_url: new URL(payload.u).origin })
      .eq("id", project.id)
      .is("site_url", null);
  }
  // Première visite reçue : le site est relié (détection réelle, plus de simulation).
  if (!project.script_detected_at) {
    await service
      .from("projects")
      .update({ script_detected_at: new Date().toISOString() })
      .eq("id", project.id)
      .is("script_detected_at", null);
  }
  return reply();
}
