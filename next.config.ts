import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Outils publicitaires branchables depuis l'espace administrateur (chargés seulement après
// consentement du visiteur) : Google (Ads et Analytics), Meta et LinkedIn.
const AD_SCRIPTS =
  "https://www.googletagmanager.com https://connect.facebook.net https://snap.licdn.com";
const AD_CONNECT =
  "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com https://www.facebook.com https://px.ads.linkedin.com";
const AD_IMAGES =
  "https://*.google-analytics.com https://www.googletagmanager.com https://www.google.com https://www.google.fr https://googleads.g.doubleclick.net https://www.facebook.com https://px.ads.linkedin.com";

// CSP appliquée en production (le serveur de dev a besoin d'eval et de websockets).
// 'unsafe-inline' reste nécessaire pour les scripts : le pré-rendu partiel (cacheComponents) sert
// des pages préparées à l'avance, qui ne peuvent pas porter un nonce par requête (incompatibilité
// documentée par Next.js). Protections qui ne dépendent pas d'un nonce (audit, lot A7) :
// - aucun attribut d'événement (onclick=, onerror=…) : React n'en écrit jamais, une injection si ;
// - aucun plugin (object-src) ;
// - espace connecté sans aucun domaine publicitaire ;
// - cookies de session illisibles par le JavaScript (lib/supabase/server.ts).
const COMMON = [
  "default-src 'self'",
  "script-src-attr 'none'",
  "object-src 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];
const contentSecurityPolicy = [
  ...COMMON,
  `script-src 'self' 'unsafe-inline' ${AD_SCRIPTS}`,
  `img-src 'self' data: blob: ${AD_IMAGES}`,
  `connect-src 'self' ${supabaseUrl} ${AD_CONNECT}`,
  "frame-src https://td.doubleclick.net https://www.googletagmanager.com",
].join("; ");
/** Tableau de bord, administration, double authentification : aucun outil publicitaire. */
const privateContentSecurityPolicy = [
  ...COMMON,
  "script-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${supabaseUrl}`,
  "frame-src 'none'",
].join("; ");
const PRIVATE_PATHS = ["/app/:path*", "/admin/:path*", "/double-authentification"];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProduction
    ? [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Pastille « N » de Next.js en développement : elle chevauchait le bas de la barre latérale.
  devIndicators: false,
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    // Règle plus stricte pour l'espace connecté (la dernière règle l'emporte sur la première).
    ...(isProduction
      ? PRIVATE_PATHS.map((source) => ({
          source,
          headers: [{ key: "Content-Security-Policy", value: privateContentSecurityPolicy }],
        }))
      : []),
    // Script de collecte chargé par les sites des clients : mis en cache une heure.
    { source: "/s.js", headers: [{ key: "Cache-Control", value: "public, max-age=3600" }] },
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
