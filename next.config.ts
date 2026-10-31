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
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${AD_SCRIPTS}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${AD_IMAGES}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${AD_CONNECT}`,
  "frame-src https://td.doubleclick.net https://www.googletagmanager.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
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
