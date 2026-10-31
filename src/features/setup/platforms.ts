import {
  Code,
  LayoutTemplate,
  MousePointerClick,
  Plug,
  Rocket,
  Send,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export type Platform = {
  id: string;
  label: string;
  /** Les 3 gestes à faire, chacun illustré par une icône. */
  steps: { icon: LucideIcon; text: string }[];
  showsSnippet: boolean;
};

export const PLATFORMS: Platform[] = [
  {
    id: "html",
    label: "Code HTML",
    showsSnippet: true,
    steps: [
      { icon: Code, text: "Copiez la ligne ci-dessous." },
      { icon: LayoutTemplate, text: "Collez-la juste avant </head>, sur toutes vos pages." },
      { icon: Rocket, text: "Mettez votre site en ligne. C'est tout." },
    ],
  },
  {
    id: "wordpress",
    label: "WordPress",
    showsSnippet: false,
    steps: [
      { icon: Plug, text: "Extensions → Ajouter → cherchez « SaasClair »." },
      { icon: MousePointerClick, text: "Installez, puis activez l'extension." },
      { icon: Settings, text: "Collez votre clé de site quand elle vous est demandée." },
    ],
  },
  {
    id: "webflow",
    label: "Webflow",
    showsSnippet: true,
    steps: [
      { icon: Settings, text: "Réglages du site → Code personnalisé." },
      { icon: LayoutTemplate, text: "Collez la ligne dans « Code de l'en-tête »." },
      { icon: Rocket, text: "Enregistrez, puis publiez le site." },
    ],
  },
  {
    id: "shopify",
    label: "Shopify",
    showsSnippet: true,
    steps: [
      { icon: ShoppingBag, text: "Boutique en ligne → Thèmes → Modifier le code." },
      { icon: LayoutTemplate, text: "Ouvrez theme.liquid, collez la ligne avant </head>." },
      { icon: Rocket, text: "Enregistrez. Le script est actif immédiatement." },
    ],
  },
  {
    id: "other",
    label: "Autre",
    showsSnippet: true,
    steps: [
      { icon: Code, text: "Copiez la ligne ci-dessous." },
      { icon: LayoutTemplate, text: "Ajoutez-la dans l'en-tête commun à toutes vos pages." },
      { icon: Send, text: "Pas sûr ? Envoyez les instructions à votre développeur." },
    ],
  },
];

/** Corps de l'email envoyé au développeur (via le logiciel de messagerie de l'utilisateur). */
export const developerEmail = (siteUrl: string, snippet: string) => ({
  subject: "Installer le script SaasClair (2 minutes)",
  body: [
    "Bonjour,",
    "",
    `Pourrais-tu ajouter cette ligne juste avant </head>, sur toutes les pages de ${siteUrl} ?`,
    "",
    snippet,
    "",
    "Elle se charge en différé, pèse moins de 5 Ko et ne lit jamais les mots de passe ni les données de paiement.",
    "",
    "Merci !",
  ].join("\n"),
});
