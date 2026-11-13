import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import zlib from "node:zlib";
import { isPrivateAddress } from "./network-guard";

export type SafeResponse = { status: number; headers: Record<string, string>; body: string };

/**
 * Résolution DNS vérifiée AU MOMENT de la connexion : l'adresse contrôlée est celle utilisée.
 * Un nom qui répond « publique » au contrôle puis « interne » à la connexion (rebinding DNS)
 * ne peut donc plus passer. Une seule adresse interne parmi les réponses suffit à refuser.
 */
const guardedLookup = ((hostname, options, callback) => {
  dnsLookup(hostname, { all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "", 4);
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      return callback(new Error("adresse interne refusée"), "", 4);
    }
    if ((options as { all?: boolean }).all)
      return (callback as never as (e: null, a: LookupAddress[]) => void)(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}) as LookupFunction;

function decoded(response: http.IncomingMessage) {
  const encoding = String(response.headers["content-encoding"] ?? "").toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") return response.pipe(zlib.createGunzip());
  if (encoding === "deflate") return response.pipe(zlib.createInflate());
  if (encoding === "br") return response.pipe(zlib.createBrotliDecompress());
  return response;
}

/**
 * GET d'une page publique : ports 80 et 443 seulement, adresses internes refusées (y compris
 * écrites en dur), délai maximal et taille maximale. Ne suit pas les redirections : l'appelant
 * revérifie chaque étape.
 */
export function safeGet(
  url: URL,
  {
    timeoutMs,
    maxBytes,
    headers,
  }: { timeoutMs: number; maxBytes: number; headers: Record<string, string> },
): Promise<SafeResponse> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "https:" && url.protocol !== "http:")
      return reject(new Error("protocole"));
    if (url.port && url.port !== "80" && url.port !== "443") return reject(new Error("port"));
    const host = url.hostname.replace(/^\[|\]$/g, "");
    // Adresse écrite en dur : la résolution DNS n'a pas lieu, on la vérifie ici.
    if (isIP(host) && isPrivateAddress(host)) return reject(new Error("adresse interne refusée"));

    const client = url.protocol === "https:" ? https : http;
    const request = client.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        headers: { ...headers, "Accept-Encoding": "gzip, deflate, br" },
        timeout: timeoutMs,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const stream = decoded(response);
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            // Assez lu : la suite de la page ne sert pas à l'analyse.
            chunks.push(chunk.subarray(0, chunk.length - (size - maxBytes)));
            response.destroy();
            stream.emit("end");
            return;
          }
          chunks.push(chunk);
        });
        stream.once("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: Object.fromEntries(
              Object.entries(response.headers).map(([key, value]) => [
                key.toLowerCase(),
                Array.isArray(value) ? value.join(", ") : String(value ?? ""),
              ]),
            ),
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        stream.once("error", reject);
      },
    );
    const deadline = setTimeout(() => request.destroy(new Error("délai dépassé")), timeoutMs);
    request.once("close", () => clearTimeout(deadline));
    request.once("timeout", () => request.destroy(new Error("délai dépassé")));
    request.once("error", reject);
    request.end();
  });
}
