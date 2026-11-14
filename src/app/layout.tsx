import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { SELF_SITE_KEY, SITE_URL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const DESCRIPTION =
  "Deux clics, et vous savez enfin d'où viennent vos clients, pourquoi ils n'achètent pas et qui va partir, sans rien configurer.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SaasClair — Captez plus de clients, gardez-les plus longtemps",
    template: "%s · SaasClair",
  },
  description: DESCRIPTION,
  openGraph: { type: "website", locale: "fr_FR", siteName: "SaasClair", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#064E3B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <body className="min-h-dvh">
        {/* Mesure d'audience de saasclair.com, avec SaasClair lui-même (sans cookie). */}
        <script async src="/s.js" data-site={SELF_SITE_KEY} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
