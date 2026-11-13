import { isIP } from "node:net";

/** « ::ffff:7f00:1 » → 8 groupes de 16 bits, ou null si l'adresse est mal formée. */
function expandIPv6(address: string): number[] | null {
  let text = address.toLowerCase().split("%")[0];
  // Forme mixte « ::ffff:127.0.0.1 » : les 32 derniers bits écrits en IPv4.
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const parts = dotted[1].split(".").map(Number);
    const high = ((parts[0] << 8) | parts[1]).toString(16);
    const low = ((parts[2] << 8) | parts[3]).toString(16);
    text = text.slice(0, -dotted[1].length) + `${high}:${low}`;
  }
  const [head, tail] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail ? tail.split(":") : [];
  const missing = 8 - left.length - right.length;
  if (text.includes("::") ? missing < 1 : missing !== 0) return null;
  const groups = [...left, ...Array(text.includes("::") ? missing : 0).fill("0"), ...right];
  const values = groups.map((group) => Number.parseInt(group, 16));
  return values.length === 8 && values.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffff)
    ? values
    : null;
}

const ipv4Of = (high: number, low: number) =>
  `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;

/**
 * Adresses internes interdites : l'audit ne doit jamais servir à sonder le réseau du serveur
 * (attaque SSRF). Couvre IPv4 privées, boucle locale, lien local, CGNAT, multidiffusion, et
 * en IPv6 : boucle locale, adresses uniques locales, lien local, multidiffusion, et toutes les
 * formes qui cachent une adresse IPv4 (::ffff:…, ::a.b.c.d, 64:ff9b::/96, 2002::/16).
 */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const g = expandIPv6(address);
    if (!g) return true;
    const zeros = (from: number, to: number) => g.slice(from, to).every((v) => v === 0);
    // :: et ::1, puis IPv4 compatible (::a.b.c.d) et mappée (::ffff:a.b.c.d).
    if (zeros(0, 6) || (zeros(0, 5) && g[5] === 0xffff)) {
      if (zeros(0, 7) && g[7] <= 1) return true;
      return isPrivateAddress(ipv4Of(g[6], g[7]));
    }
    // Traduction NAT64 (64:ff9b::/96) et 6to4 (2002::/16) : l'IPv4 cachée décide.
    if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6))
      return isPrivateAddress(ipv4Of(g[6], g[7]));
    if (g[0] === 0x2002) return isPrivateAddress(ipv4Of(g[1], g[2]));
    return (
      (g[0] & 0xfe00) === 0xfc00 || // fc00::/7 unique locale
      (g[0] & 0xffc0) === 0xfe80 || // fe80::/10 lien local
      (g[0] & 0xff00) === 0xff00 // ff00::/8 multidiffusion
    );
  }
  if (isIP(address) !== 4) return true;
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}
