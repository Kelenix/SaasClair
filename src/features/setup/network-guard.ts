import { isIP } from "node:net";

/**
 * Adresses internes interdites : l'audit ne doit jamais servir à sonder le réseau du serveur
 * (attaque SSRF). Couvre IPv4 privées, boucle locale, lien local, CGNAT et équivalents IPv6.
 */
export function isPrivateAddress(address: string) {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return lower === "::" || lower === "::1" || /^(fc|fd|fe8|fe9|fea|feb)/.test(lower);
  }
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}
