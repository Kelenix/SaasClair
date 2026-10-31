"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, Megaphone, Save, ShieldCheck } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveSiteSettings } from "./settings-actions";
import { siteSettingsSchema, type SiteSettingsInput } from "./settings-schema";

type Field = {
  name: keyof SiteSettingsInput;
  label: string;
  placeholder: string;
  help: string;
};

const PIXELS: { title: string; fields: Field[] }[] = [
  {
    title: "Google Ads",
    fields: [
      {
        name: "googleAdsId",
        label: "ID de conversion",
        placeholder: "AW-123456789",
        help: "Google Ads › Objectifs › Conversions › votre action › Configuration de la balise.",
      },
      {
        name: "googleAdsConversionLabel",
        label: "Libellé de la conversion « inscription »",
        placeholder: "AbC-12dEf",
        help: "La partie après la barre oblique dans « send_to » (AW-…/libellé). Envoyée à chaque inscription.",
      },
    ],
  },
  {
    title: "Google Analytics 4",
    fields: [
      {
        name: "ga4Id",
        label: "ID de mesure",
        placeholder: "G-ABC123XYZ",
        help: "Analytics › Administration › Flux de données › votre site.",
      },
    ],
  },
  {
    title: "Meta (Facebook et Instagram)",
    fields: [
      {
        name: "metaPixelId",
        label: "ID du pixel",
        placeholder: "123456789012345",
        help: "Gestionnaire d'évènements Meta › Sources de données › votre pixel.",
      },
    ],
  },
  {
    title: "LinkedIn",
    fields: [
      {
        name: "linkedinPartnerId",
        label: "Partner ID (Insight Tag)",
        placeholder: "1234567",
        help: "Campaign Manager › Données analytiques › Insight Tag.",
      },
    ],
  },
];

/** Identifiants publicitaires et contact : vérifiés en direct, enregistrés en un clic. */
export function SettingsForm({ initial }: { initial: Record<keyof SiteSettingsInput, string> }) {
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const check = siteSettingsSchema.safeParse(values);
  const errorOf = (name: keyof SiteSettingsInput) =>
    check.success ? undefined : check.error.issues.find((issue) => issue.path[0] === name)?.message;
  const set = (name: keyof SiteSettingsInput, value: string) =>
    setValues((current) => ({ ...current, [name]: value }));
  const active = PIXELS.filter((group) => values[group.fields[0].name]?.trim()).length;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!check.success) return void toast.error(check.error.issues[0]?.message);
    startTransition(async () => {
      const result = await saveSiteSettings(values);
      if (result.ok) toast.success("Réglages enregistrés. Le site les utilise tout de suite.");
      else toast.error(result.message);
    });
  };

  const field = (item: Field) => {
    const id = `reglage-${item.name}`;
    const error = values[item.name] ? errorOf(item.name) : undefined;
    return (
      <div key={item.name} className="grid gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {item.label}
        </label>
        <Input
          id={id}
          value={values[item.name]}
          placeholder={item.placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => set(item.name, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-aide`}
        />
        <p
          id={`${id}-aide`}
          className={error ? "text-[13px] text-danger" : "text-[13px] text-slate"}
        >
          {error ?? item.help}
        </p>
      </div>
    );
  };

  return (
    <form onSubmit={save} className="grid gap-4">
      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardEyebrow>Publicité et mesure d&apos;audience</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              {active
                ? `${active} outil${active > 1 ? "s" : ""} branché${active > 1 ? "s" : ""}.`
                : "Aucun pixel branché."}
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-gold-tint text-gold-ink">
            <Icon icon={Megaphone} anim="wiggle" />
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-2">
          {PIXELS.map((group) => (
            <fieldset key={group.title} className="grid gap-4 rounded-2xl border border-line p-4">
              <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-forest">
                {group.title}
                {values[group.fields[0].name]?.trim() ? (
                  <Badge tone="growth">Branché</Badge>
                ) : (
                  <Badge>Non branché</Badge>
                )}
              </legend>
              {group.fields.map(field)}
            </fieldset>
          ))}
        </div>
        <p className="mt-5 flex gap-2.5 rounded-xl border-l-4 border-emerald bg-cream px-3.5 py-3 text-[14px] text-ink">
          <Icon icon={ShieldCheck} anim="pop" className="mt-0.5 size-4 shrink-0 text-emerald-ink" />
          <span>
            Conformément au RGPD, ces traceurs ne se chargent qu&apos;après l&apos;accord du
            visiteur (bandeau de consentement), et uniquement sur le site vitrine et les pages
            d&apos;inscription : jamais dans le tableau de bord de vos clients.
          </span>
        </p>
      </Card>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <CardEyebrow>Contact</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">Où vous écrire.</p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
            <Icon icon={Mail} anim="nudge" />
          </span>
        </div>
        {field({
          name: "contactEmail",
          label: "Email de contact",
          placeholder: "bonjour@saasclair.fr",
          help: "Affiché dans le pied de page du site.",
        })}
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Icon icon={Save} anim="pop" />{" "}
          {isPending ? "Enregistrement…" : "Enregistrer les réglages"}
        </Button>
      </div>
    </form>
  );
}
