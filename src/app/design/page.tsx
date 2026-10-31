import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  ChartLine,
  CircleCheck,
  Copy,
  CreditCard,
  Mail,
  MousePointerClick,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { Icon, type IconAnimation } from "@/components/brand/icon";
import { Logo } from "@/components/brand/logo";
import { BarChart } from "@/components/data/bar-chart";
import { LiveDot } from "@/components/data/live-dot";
import { RiskMeter } from "@/components/data/risk-meter";
import { Cascade, CascadeItem, Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FieldsDemo, KpiDemo, NavigationDemo, OverlaysDemo, StatesDemo } from "./interactive-demos";

export const metadata: Metadata = {
  title: "Système de design",
  robots: { index: false },
};

const PALETTE = [
  {
    name: "Vert forêt",
    hex: "#064E3B",
    role: "Titres, boutons principaux, barre latérale.",
    share: 30,
    className: "bg-forest text-cream",
  },
  {
    name: "Émeraude",
    hex: "#10B981",
    role: "Croissance, graphiques, succès. Jamais en texte courant.",
    share: 10,
    className: "bg-emerald text-forest",
  },
  {
    name: "Or",
    hex: "#F5B700",
    role: "Attention : clients à risque, surlignages. Petite touche.",
    share: 5,
    className: "bg-gold text-forest",
  },
  {
    name: "Crème",
    hex: "#FAF7F0",
    role: "Fond principal. Les cartes sont blanches dessus.",
    share: 55,
    className: "bg-cream text-forest",
  },
];

const TEXT_TOKENS = [
  { name: "Encre", hex: "#0F1F1A", className: "bg-ink" },
  { name: "Ardoise", hex: "#5B6B65", className: "bg-slate" },
  { name: "Émeraude texte", hex: "#047857", className: "bg-emerald-ink" },
  { name: "Or texte", hex: "#8F5F00", className: "bg-gold-ink" },
  { name: "Bordure", hex: "#E6E0D2", className: "bg-line" },
  { name: "Sable", hex: "#EFEBE1", className: "bg-sand" },
];

const CHANNELS = [
  { label: "SEO", value: 9800 },
  { label: "LinkedIn", value: 6200 },
  { label: "Direct", value: 4100 },
  { label: "Partenaires", value: 3100 },
  { label: "Instagram", value: 1800, highlight: true },
];

const AT_RISK = [
  {
    initials: "LB",
    name: "Lumen Bureau",
    mrr: 420,
    score: 82,
    reason: "Pas de connexion depuis 18 jours",
  },
  {
    initials: "AC",
    name: "Atelier Cobalt",
    mrr: 290,
    score: 64,
    reason: "Carte bancaire expirée dans 6 jours",
  },
  { initials: "NV", name: "Nova Vélo", mrr: 180, score: 48, reason: "Usage en baisse de 40 %" },
];

const ICONS: { icon: typeof Bell; anim: IconAnimation; label: string }[] = [
  { icon: Bell, anim: "wiggle", label: "Alertes" },
  { icon: ChartLine, anim: "bounce", label: "Revenus" },
  { icon: Users, anim: "pop", label: "Clients" },
  { icon: MousePointerClick, anim: "tilt", label: "Tunnel" },
  { icon: CreditCard, anim: "nudge", label: "Paiements" },
  { icon: Settings, anim: "spin", label: "Paramètres" },
  { icon: Search, anim: "tilt", label: "Question" },
  { icon: Mail, anim: "bounce", label: "Email" },
  { icon: Sparkles, anim: "pop", label: "Insights" },
  { icon: Copy, anim: "pop", label: "Copier" },
  { icon: CircleCheck, anim: "bounce", label: "Succès" },
  { icon: ArrowRight, anim: "nudge", label: "Suivant" },
];

const MOTION_TOKENS = [
  { name: "Micro-interactions", value: "200 ms", usage: "Boutons, interrupteurs, survols" },
  { name: "Transitions d'écran", value: "400 ms", usage: "Pages, panneaux, étapes" },
  { name: "Révélation de données", value: "900 ms", usage: "Compteurs, courbes, barres, jauges" },
  { name: "Cascade", value: "60 ms", usage: "Décalage entre deux cartes" },
];

function Section({
  index,
  eyebrow,
  title,
  lead,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-16 sm:py-20">
      <Reveal className="mb-10">
        <p className="eyebrow">
          <span className="mr-2.5 text-slate">{index}</span>
          {eyebrow}
        </p>
        <h2 className="text-3xl sm:text-4xl">{title}</h2>
        {lead && <p className="mt-3 max-w-2xl text-[17px] text-slate">{lead}</p>}
      </Reveal>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <header className="relative overflow-hidden bg-forest text-cream">
        <div
          aria-hidden
          className="absolute -top-44 -right-44 size-[560px] rounded-full border-[70px] border-emerald/15"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-10 sm:pt-14 sm:pb-28">
          <Logo variant="inverse" priority className="mb-16 h-8 sm:mb-20" />
          <p className="eyebrow text-gold!">Système de design · v1</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[1.02] text-cream sm:text-7xl">
            Clair. Direct. <em className="text-emerald not-italic">Rassurant.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/80">
            Toutes les briques de SaasClair, fidèles au brand kit : couleurs, typographies,
            composants et animations. Chaque écran du produit est construit avec elles.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-10">
        <Section
          index="01"
          eyebrow="Logo"
          title="Le logo, tel que fourni."
          lead="Fichiers d'origine détourés, jamais redessinés. Version inversée sur fond vert forêt."
        >
          <Cascade className="grid grid-cols-1 gap-5 md:grid-cols-[1.4fr_1fr_1fr]">
            <CascadeItem>
              <Card className="flex min-h-56 flex-col justify-between">
                <div className="grid flex-1 place-items-center">
                  <Logo className="h-10" />
                </div>
                <p className="text-xs text-slate">Logo principal — sur fond clair</p>
              </Card>
            </CascadeItem>
            <CascadeItem>
              <Card className="flex min-h-56 flex-col justify-between border-forest bg-forest">
                <div className="grid flex-1 place-items-center">
                  <Logo variant="inverse" className="h-8" />
                </div>
                <p className="text-xs text-cream/75">Version inversée — sur fond vert forêt</p>
              </Card>
            </CascadeItem>
            <CascadeItem>
              <Card className="flex min-h-56 flex-col justify-between bg-cream">
                <div className="flex flex-1 items-center justify-center gap-5">
                  <Logo variant="mark" className="size-24" />
                  <Logo variant="mark" className="size-12" />
                  <Logo variant="mark" className="size-6" />
                </div>
                <p className="text-xs text-slate">Monogramme — icône d&apos;app, favicon</p>
              </Card>
            </CascadeItem>
          </Cascade>
        </Section>

        <Section
          index="02"
          eyebrow="Couleurs"
          title="Quatre couleurs, des proportions fixes."
          lead="Crème 55 %, forêt 30 %, émeraude 10 %, or 5 %. Les variantes « texte » garantissent un contraste AA."
        >
          <Cascade className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.4fr_1fr_1fr]">
            {PALETTE.map((color) => (
              <CascadeItem key={color.hex}>
                <div className="overflow-hidden rounded-card border border-line bg-white">
                  <div
                    className={cn(
                      "flex h-36 items-end p-5 font-serif text-2xl font-semibold",
                      color.className,
                    )}
                  >
                    {color.share} %
                  </div>
                  <div className="p-5">
                    <p className="font-semibold">{color.name}</p>
                    <code className="my-2 inline-block rounded-md border border-line bg-cream px-2 py-0.5 text-sm">
                      {color.hex}
                    </code>
                    <p className="text-sm text-slate">{color.role}</p>
                  </div>
                </div>
              </CascadeItem>
            ))}
          </Cascade>
          <div
            className="mt-6 flex h-3.5 overflow-hidden rounded-full"
            role="img"
            aria-label="Proportions : crème 55 %, forêt 30 %, émeraude 10 %, or 5 %"
          >
            <span className="w-[55%] border border-line bg-cream" />
            <span className="w-[30%] bg-forest" />
            <span className="w-[10%] bg-emerald" />
            <span className="w-[5%] bg-gold" />
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TEXT_TOKENS.map((token) => (
              <li
                key={token.hex}
                className="flex items-center gap-3 rounded-xl border border-line bg-white p-3"
              >
                <span
                  className={cn(
                    "size-8 shrink-0 rounded-lg border border-black/5",
                    token.className,
                  )}
                />
                <span className="text-xs">
                  <span className="block font-semibold">{token.name}</span>
                  <span className="text-slate">{token.hex}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section index="03" eyebrow="Typographies" title="Fraunces pour parler, Inter pour lire.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card className="p-8 sm:p-10">
              <p className="font-serif text-8xl leading-none font-semibold text-forest">Aa</p>
              <p className="mt-6 text-lg font-semibold">Fraunces 600</p>
              <p className="text-sm text-slate">Titres, grands chiffres, accroches.</p>
            </Card>
            <Card className="p-8 sm:p-10">
              <p className="text-8xl leading-none font-semibold text-forest">Aa</p>
              <p className="mt-6 text-lg font-semibold">Inter 400 à 700</p>
              <p className="text-sm text-slate">
                Texte, interface, tableaux. Chiffres tabulaires :{" "}
                <span className="tabular-nums">1 750 €</span>
              </p>
            </Card>
          </div>
          <Card className="mt-5 divide-y divide-line px-6 py-2 sm:px-10">
            {[
              [
                "Titre 1 · 56/60",
                "font-serif text-4xl font-semibold text-forest sm:text-[56px]",
                "Comprenez votre SaaS en 5 minutes.",
              ],
              [
                "Titre 2 · 40",
                "font-serif text-3xl font-semibold text-forest sm:text-[40px]",
                "Qui va partir ce mois-ci ?",
              ],
              [
                "Chiffre clé · 32",
                "font-serif text-[32px] font-semibold text-forest tabular-nums",
                "25 000 €",
              ],
              [
                "Texte · 17",
                "text-[17px] text-slate",
                "3 clients risquent de partir. Vous avez 10 jours pour les retenir.",
              ],
              ["Libellé · 12", "eyebrow mb-0!", "Revenu mensuel récurrent"],
            ].map(([label, className, sample]) => (
              <div
                key={label}
                className="grid gap-1 py-5 sm:grid-cols-[160px_1fr] sm:items-baseline"
              >
                <span className="font-mono text-xs text-slate">{label}</span>
                <span className={className}>{sample}</span>
              </div>
            ))}
          </Card>
        </Section>

        <Section
          index="04"
          eyebrow="Boutons"
          title="Des pilules qui répondent au doigt."
          lead="Survolez, cliquez : chaque bouton se soulève, se contracte, et son icône s'anime."
        >
          <Card className="flex flex-col gap-8 p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Essai gratuit</Button>
              <Button variant="secondary">Voir une démo</Button>
              <Button variant="positive">
                Analyser mon SaaS <Icon icon={ArrowRight} anim="nudge" />
              </Button>
              <Button variant="ghost">Ignorer</Button>
              <Button variant="link">Choisir une autre page</Button>
              <Button disabled>Indisponible</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Petit · 44 px</Button>
              <Button size="md">Moyen · 48 px</Button>
              <Button size="lg">Grand · 56 px</Button>
              <Button size="icon" variant="secondary" aria-label="Notifications">
                <Icon icon={Bell} anim="wiggle" />
              </Button>
            </div>
            <div className="-mx-6 -mb-6 flex flex-wrap items-center gap-3 rounded-b-card bg-forest p-6 sm:-mx-10 sm:-mb-10 sm:px-10">
              <Button variant="inverse">Connecter Stripe</Button>
              <Button variant="positive">C&apos;est parti</Button>
            </div>
          </Card>
        </Section>

        <Section
          index="05"
          eyebrow="Champs et commandes"
          title="Des formulaires qui rassurent."
          lead="Validation en temps réel, messages bienveillants, zones tactiles d'au moins 44 px."
        >
          <FieldsDemo />
        </Section>

        <Section
          index="06"
          eyebrow="Indicateurs"
          title="Les chiffres défilent, les courbes se tracent."
          lead="Changez la période : les compteurs repartent de leur valeur actuelle."
        >
          <KpiDemo />
        </Section>

        <Section
          index="07"
          eyebrow="Graphiques"
          title="Des barres qui poussent, des jauges qui se remplissent."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardEyebrow>Canaux par revenu</CardEyebrow>
              <CardTitle className="mb-6">Le SEO rapporte le plus.</CardTitle>
              <BarChart bars={CHANNELS} format="euro" />
              <p className="mt-4 text-sm text-slate">
                <Badge tone="attention" className="mr-2">
                  À surveiller
                </Badge>
                Instagram convertit mal sur mobile.
              </p>
            </Card>
            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <CardEyebrow>Clients à risque</CardEyebrow>
                  <CardTitle>3 clients risquent de partir.</CardTitle>
                </div>
                <Badge tone="attention" pulse>
                  <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                  {formatEuro(890)} / mois
                </Badge>
              </div>
              <ul>
                {AT_RISK.map((customer) => (
                  <li
                    key={customer.name}
                    className="flex items-center justify-between gap-3 border-t border-line py-3.5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cream text-xs font-bold text-forest">
                        {customer.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {customer.name}
                        </span>
                        <span className="block truncate text-xs text-slate">{customer.reason}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatEuro(customer.mrr)}
                      </span>
                      <RiskMeter score={customer.score} className="w-16 sm:w-24" />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center justify-between text-sm text-slate">
                Vous avez 10 jours pour les retenir.
                <LiveDot />
              </p>
            </Card>
          </div>
        </Section>

        <Section index="08" eyebrow="Navigation" title="Onglets et questions fréquentes.">
          <NavigationDemo />
        </Section>

        <Section
          index="09"
          eyebrow="Panneaux et notifications"
          title="Tout glisse, rien ne surgit."
          lead="Le fond s'assombrit progressivement ; les toasts disparaissent seuls."
        >
          <OverlaysDemo />
        </Section>

        <Section
          index="10"
          eyebrow="États"
          title="Chargement, vide, erreur : jamais d'écran blanc."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card aria-busy="true" aria-label="Chargement des indicateurs">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-4 h-9 w-40" />
              <Skeleton className="mt-3 h-3 w-20" />
              <Skeleton className="mt-6 h-10 w-full" />
            </Card>
            <StatesDemo />
          </div>
        </Section>

        <Section
          index="11"
          eyebrow="Icônes"
          title="Aucune icône immobile."
          lead="Elles apparaissent avec un ressort, réagissent au survol et se contractent au clic."
        >
          <Cascade className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {ICONS.map(({ icon, anim, label }) => (
              <CascadeItem key={label}>
                <button
                  type="button"
                  className="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-line bg-white text-forest transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card"
                >
                  <Icon icon={icon} anim={anim} className="size-6" />
                  <span className="text-xs text-slate">{label}</span>
                </button>
              </CascadeItem>
            ))}
          </Cascade>
        </Section>

        <Section
          index="12"
          eyebrow="Animation"
          title="Des durées précises, des courbes douces."
          lead="Seules la position, l'échelle et l'opacité s'animent. Avec « réduire les animations », tout devient un simple fondu."
        >
          <Card className="divide-y divide-line px-6 py-2">
            {MOTION_TOKENS.map((token) => (
              <div
                key={token.name}
                className="grid gap-1 py-4 sm:grid-cols-[220px_100px_1fr] sm:items-center"
              >
                <span className="font-semibold">{token.name}</span>
                <span className="font-serif text-xl text-forest tabular-nums">{token.value}</span>
                <span className="text-sm text-slate">{token.usage}</span>
              </div>
            ))}
          </Card>
        </Section>
      </main>

      <footer className="bg-forest py-10 text-sm text-cream/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-10">
          <Logo variant="inverse" className="h-6" />
          <p>Captez plus de clients, gardez-les plus longtemps.</p>
        </div>
      </footer>
    </>
  );
}
