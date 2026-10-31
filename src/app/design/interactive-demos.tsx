"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Inbox,
  PanelRight,
  RotateCw,
  WifiOff,
} from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { Sparkline } from "@/components/data/sparkline";
import { Cascade, CascadeItem } from "@/components/motion/reveal";
import { StateMessage } from "@/components/states/state-message";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NumberFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---------- Champs ----------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FieldsDemo() {
  const [email, setEmail] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const isValid = EMAIL_PATTERN.test(email);
  const showError = isTouched && !isValid;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-6 sm:p-8">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setIsTouched(true);
            if (isValid) toast.success("Adresse enregistrée.");
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="demo-email" className="text-sm font-semibold text-ink">
            Adresse email
          </Label>
          <Input
            id="demo-email"
            type="email"
            autoComplete="email"
            placeholder="nadia@votre-saas.fr"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setIsTouched(email.length > 0)}
            aria-invalid={showError}
            aria-describedby="demo-email-help"
          />
          <p
            id="demo-email-help"
            className={cn("min-h-5 text-sm", showError ? "text-danger" : "text-slate")}
            aria-live="polite"
          >
            {showError
              ? "Cette adresse semble incomplète. Vérifiez le @ et le domaine."
              : isValid
                ? "Parfait."
                : "Nous ne l'utiliserons que pour vos rapports."}
          </p>
          <Button type="submit" className="mt-2 self-start">
            Continuer
          </Button>
        </form>
      </Card>
      <Card className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="demo-alerts" className="flex flex-col items-start gap-0.5 text-sm">
            <span className="font-semibold text-ink">Alertes par email</span>
            <span className="font-normal text-slate">Activées par défaut.</span>
          </Label>
          <Switch id="demo-alerts" defaultChecked />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="demo-slack" className="flex flex-col items-start gap-0.5 text-sm">
            <span className="font-semibold text-ink">Alertes Slack</span>
            <span className="font-normal text-slate">Facultatif.</span>
          </Label>
          <Switch id="demo-slack" />
        </div>
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox id="demo-anonymize" defaultChecked />
          <Label htmlFor="demo-anonymize" className="text-sm text-ink">
            Anonymiser les adresses IP de mes visiteurs
          </Label>
        </div>
      </Card>
    </div>
  );
}

// ---------- Indicateurs ----------

type Period = "30j" | "12m";

type Kpi = {
  label: string;
  format: NumberFormat;
  values: Record<Period, number>;
  deltas: Record<Period, string>;
  isGood: boolean;
  trend: Record<Period, number[]>;
  tone: "emerald" | "gold";
};

const KPIS: Kpi[] = [
  {
    label: "Revenu mensuel récurrent",
    format: "euro",
    values: { "30j": 25000, "12m": 25000 },
    deltas: { "30j": "+4,2 %", "12m": "+38 %" },
    isGood: true,
    trend: {
      "30j": [22, 23, 23.4, 23.1, 24, 24.6, 25],
      "12m": [14, 15.5, 16, 17.8, 18.4, 20, 21.2, 22, 23.1, 24, 24.6, 25],
    },
    tone: "emerald",
  },
  {
    label: "Taux de churn",
    format: "percent",
    values: { "30j": 7, "12m": 8.1 },
    deltas: { "30j": "−0,6 pt", "12m": "−1,4 pt" },
    isGood: true,
    trend: {
      "30j": [8.2, 7.9, 7.8, 7.5, 7.4, 7.2, 7],
      "12m": [9.6, 9.4, 9.1, 9, 8.8, 8.6, 8.4, 8.2, 7.9, 7.6, 7.3, 7],
    },
    tone: "emerald",
  },
  {
    label: "Revenu à risque",
    format: "euro",
    values: { "30j": 1750, "12m": 2140 },
    deltas: { "30j": "4 clients", "12m": "11 clients" },
    isGood: false,
    trend: {
      "30j": [900, 1100, 1240, 1300, 1500, 1620, 1750],
      "12m": [1200, 1500, 1700, 2000, 2300, 2100, 1900, 2200, 2400, 2100, 1900, 2140],
    },
    tone: "gold",
  },
  {
    label: "Conversion essai → payant",
    format: "percent",
    values: { "30j": 18.4, "12m": 16.9 },
    deltas: { "30j": "+1,2 pt", "12m": "+3,0 pt" },
    isGood: true,
    trend: {
      "30j": [16.8, 17.1, 17, 17.6, 17.9, 18.1, 18.4],
      "12m": [13.9, 14.2, 14.8, 15, 15.4, 15.6, 16, 16.4, 16.8, 17.2, 17.9, 18.4],
    },
    tone: "emerald",
  },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: "30j", label: "30 jours" },
  { id: "12m", label: "12 mois" },
];

export function KpiDemo() {
  const [period, setPeriod] = useState<Period>("30j");
  return (
    <>
      <div role="group" aria-label="Période" className="mb-6 inline-flex rounded-full bg-sand p-1">
        {PERIODS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={period === id}
            onClick={() => setPeriod(id)}
            className="h-11 cursor-pointer rounded-full px-5 text-sm font-semibold text-slate transition-[background-color,color,box-shadow,scale] duration-200 ease-spring active:scale-95 aria-pressed:bg-white aria-pressed:text-forest aria-pressed:shadow-card"
          >
            {label}
          </button>
        ))}
      </div>
      <Cascade className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => (
          <CascadeItem key={kpi.label}>
            <Card interactive className="flex h-full flex-col gap-1 p-5">
              <p className="text-[13px] font-medium text-slate">{kpi.label}</p>
              <AnimatedNumber
                value={kpi.values[period]}
                format={kpi.format}
                className="font-serif text-[32px] leading-tight font-semibold text-forest"
              />
              <Badge tone={kpi.isGood ? "growth" : "attention"}>
                <Icon icon={kpi.isGood ? ArrowUpRight : ArrowDownRight} className="size-3.5" />
                {kpi.deltas[period]}
              </Badge>
              <Sparkline
                key={period}
                data={kpi.trend[period]}
                tone={kpi.tone}
                label={`Évolution : ${kpi.label}`}
                className="mt-3"
              />
            </Card>
          </CascadeItem>
        ))}
      </Cascade>
    </>
  );
}

// ---------- Navigation ----------

const PLATFORMS = [
  {
    id: "html",
    label: "Code HTML",
    text: "Collez la ligne juste avant la balise </head> de toutes vos pages.",
  },
  {
    id: "wordpress",
    label: "WordPress",
    text: "Installez l'extension SaasClair, elle ajoute le script pour vous.",
  },
  {
    id: "webflow",
    label: "Webflow",
    text: "Réglages du site → Code personnalisé → En-tête. Collez, publiez.",
  },
  {
    id: "shopify",
    label: "Shopify",
    text: "Thème → Modifier le code → theme.liquid, avant </head>.",
  },
  { id: "other", label: "Autre", text: "Envoyez les instructions à votre développeur en un clic." },
];

const FAQ = [
  [
    "Dois-je configurer quelque chose ?",
    "Non. Vous collez une ligne de code et vous connectez Stripe. Tout le reste est automatique.",
  ],
  [
    "Mes données sont-elles en sécurité ?",
    "Oui. Hébergement en Europe, Stripe en lecture uniquement, adresses email chiffrées avant comparaison.",
  ],
  [
    "Combien de temps avant les premiers résultats ?",
    "Vos chiffres de revenu apparaissent dès la connexion de Stripe. Les premiers insights arrivent sous 24 heures.",
  ],
];

export function NavigationDemo() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="min-w-0">
        <Tabs defaultValue="html">
          <TabsList aria-label="Votre plateforme">
            {PLATFORMS.map((platform) => (
              <TabsTrigger key={platform.id} value={platform.id}>
                {platform.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PLATFORMS.map((platform) => (
            <TabsContent
              key={platform.id}
              value={platform.id}
              className="rounded-xl bg-cream p-5 text-[15px] text-ink"
            >
              {platform.text}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
      <Card className="py-2">
        <Accordion type="single" collapsible defaultValue="faq-0">
          {FAQ.map(([question, answer], index) => (
            <AccordionItem key={question} value={`faq-${index}`}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent>{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}

// ---------- Panneaux et toasts ----------

export function OverlaysDemo() {
  return (
    <Card className="flex flex-wrap gap-3 p-6 sm:p-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">
            <Icon icon={PanelRight} anim="nudge" /> Fiche client
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <Badge tone="attention" pulse>
              Risque élevé
            </Badge>
            <SheetTitle className="mt-2">Lumen Bureau</SheetTitle>
            <SheetDescription>420 € par mois · client depuis 14 mois</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3 text-[15px] text-slate">
            <p>Pas de connexion depuis 18 jours.</p>
            <p>Renouvellement le 12 novembre.</p>
          </SheetBody>
          <SheetFooter>
            <Button onClick={() => toast.success("Email de relance prêt.")}>
              Préparer un email de relance
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">
            <Icon icon={Filter} anim="bounce" /> Filtres (mobile)
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
            <SheetDescription>Le panneau glisse depuis le bas sur téléphone.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button>Afficher les résultats</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Question en un clic</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Est-ce votre page de paiement ?</DialogTitle>
            <DialogDescription>
              Nous n&apos;avons pas trouvé votre page de paiement. Est-ce celle-ci :
              votre-saas.fr/checkout ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Choisir une autre page</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button onClick={() => toast.success("Merci, c'est noté.")}>Oui</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="positive" onClick={() => toast.success("Script détecté. Tout fonctionne.")}>
        Afficher un toast
      </Button>
    </Card>
  );
}

// ---------- États vide et erreur ----------

export function StatesDemo() {
  const [isRetrying, setIsRetrying] = useState(false);
  return (
    <>
      <Card>
        <StateMessage
          icon={Inbox}
          title="Aucun client à risque."
          description="Tout va bien cette semaine. Nous vous prévenons dès qu'un client montre des signes de départ."
        />
      </Card>
      <Card>
        <StateMessage
          tone="error"
          icon={WifiOff}
          anim="wiggle"
          title="Les chiffres n'ont pas pu charger."
          description="Vos données sont intactes. Réessayez dans un instant."
          action={
            <Button
              variant="secondary"
              size="sm"
              disabled={isRetrying}
              onClick={() => {
                setIsRetrying(true);
                setTimeout(() => {
                  setIsRetrying(false);
                  toast.success("C'est reparti.");
                }, 900);
              }}
            >
              <Icon icon={RotateCw} anim="spin" className={cn(isRetrying && "animate-spin")} />
              Réessayer
            </Button>
          }
        />
      </Card>
    </>
  );
}
