import {
  Code,
  FileCode,
  LayoutTemplate,
  MousePointerClick,
  Plug,
  Rocket,
  Send,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

// Où coller la ligne de script, selon la plateforme. Toujours UNE SEULE FOIS, dans l'en-tête
// commun à tout le site : elle suit ensuite toutes les pages, même des milliers.

export type Platform = {
  id: string;
  label: string;
  /** Les 3 gestes à faire, chacun illustré par une icône. */
  steps: { icon: LucideIcon; text: string }[];
  /** Technologies (détectées par l'analyse du site) pour lesquelles cet onglet s'ouvre seul. */
  detects: string[];
};

export const PLATFORMS: Platform[] = [
  {
    id: "html",
    label: "HTML",
    detects: [],
    steps: [
      { icon: Code, text: "Copiez la ligne ci-dessous." },
      {
        icon: LayoutTemplate,
        text: "Collez-la une seule fois, avant </head>, dans le gabarit commun à toutes vos pages.",
      },
      { icon: Rocket, text: "Mettez votre site en ligne. Toutes vos pages sont suivies." },
    ],
  },
  {
    id: "nextjs",
    label: "Next.js",
    detects: ["Next.js"],
    steps: [
      {
        icon: FileCode,
        text: "Ouvrez le fichier commun : app/layout.tsx (ou pages/_document.tsx).",
      },
      {
        icon: LayoutTemplate,
        text: "Collez la ligne dans <head>, une seule fois : elle vaut pour tout le site.",
      },
      { icon: Rocket, text: "Déployez. Les changements de page sont suivis automatiquement." },
    ],
  },
  {
    id: "wordpress",
    label: "WordPress",
    detects: ["WordPress"],
    steps: [
      {
        icon: Plug,
        text: "Extensions → Ajouter : installez et activez « WPCode » (gratuite).",
      },
      {
        icon: MousePointerClick,
        text: "Code Snippets → Header & Footer : collez la ligne dans « Header ».",
      },
      { icon: Rocket, text: "Enregistrez. Toutes vos pages sont suivies." },
    ],
  },
  {
    id: "webflow",
    label: "Webflow",
    detects: ["Webflow"],
    steps: [
      { icon: Settings, text: "Réglages du site → Code personnalisé." },
      {
        icon: LayoutTemplate,
        text: "Collez la ligne dans « Code de l'en-tête » : elle vaut pour tout le site.",
      },
      { icon: Rocket, text: "Enregistrez, puis publiez le site." },
    ],
  },
  {
    id: "shopify",
    label: "Shopify",
    detects: ["Shopify"],
    steps: [
      { icon: ShoppingBag, text: "Boutique en ligne → Thèmes → … → Modifier le code." },
      {
        icon: LayoutTemplate,
        text: "Ouvrez theme.liquid (commun à toute la boutique) et collez la ligne avant </head>.",
      },
      { icon: Rocket, text: "Enregistrez. Toute la boutique est suivie." },
    ],
  },
  {
    id: "other",
    label: "Wix, Framer…",
    detects: ["Wix", "Framer", "Nuxt"],
    steps: [
      {
        icon: Settings,
        text: "Wix : Réglages → Code personnalisé → En-tête, sur « Toutes les pages ».",
      },
      {
        icon: LayoutTemplate,
        text: "Framer : Site Settings → Custom Code → « Start of <head> tag ».",
      },
      {
        icon: Send,
        text: "Autre outil : son en-tête commun. Pas sûr ? Envoyez les instructions ci-dessus.",
      },
    ],
  },
];

/** Onglet à ouvrir d'office, selon la technologie détectée sur le site (sinon « Code HTML »). */
export function platformFor(technologies: string[]): Platform {
  return (
    PLATFORMS.find((platform) => platform.detects.some((tech) => technologies.includes(tech))) ??
    PLATFORMS[0]
  );
}

/** Corps de l'email envoyé au développeur (via le logiciel de messagerie de l'utilisateur). */
export const developerEmail = (siteUrl: string, snippet: string) => ({
  subject: "Ajouter la ligne SaasClair à notre site (2 minutes)",
  body: [
    "Bonjour,",
    "",
    `Pourrais-tu ajouter cette ligne une seule fois sur ${siteUrl}, juste avant </head> dans le gabarit commun à toutes les pages (app/layout.tsx pour Next.js, theme.liquid pour Shopify, « Code de l'en-tête » pour Webflow, WPCode pour WordPress) ?`,
    "",
    snippet,
    "",
    "Elle suit automatiquement toutes les pages, y compris les changements de page des applications React. Elle se charge en différé, pèse moins de 3 Ko et ne lit jamais les mots de passe ni les données de paiement.",
    "",
    "Merci !",
  ].join("\n"),
});
