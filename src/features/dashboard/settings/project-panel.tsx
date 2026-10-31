"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, CreditCard, ExternalLink, Globe, Link2, Rocket } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { AnimatedNumber } from "@/components/data/animated-number";
import { GrowBar } from "@/components/data/grow-bar";
import { LiveDot } from "@/components/data/live-dot";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyBlock } from "@/features/setup/step-script";
import { scriptSnippet } from "@/features/setup/steps";
import { displaySiteUrl } from "@/lib/site-url";
import { COVERAGE } from "../acquisition/data";
import { confirmCheckoutPage } from "../actions";
import { NADIA_CUSTOMERS } from "../demo-utils";

export type ProjectInfo = {
  siteUrl: string | null;
  siteKey: string | null;
  checkoutUrl: string | null;
  scriptDetected: boolean;
  stripeConnected: boolean;
};

function StatusRow({
  icon,
  title,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>["icon"];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-4 first:border-0 first:pt-0">
      <span className="flex items-center gap-3 font-semibold text-ink">
        <span className="grid size-9 place-items-center rounded-full bg-cream text-forest">
          <Icon icon={icon} anim="pop" className="size-4" />
        </span>
        {title}
      </span>
      {children}
    </li>
  );
}

/** Page de paiement : modifiable en une ligne, même règle que le bandeau de confirmation. */
function CheckoutForm({ siteUrl, current }: { siteUrl: string; current: string | null }) {
  const id = useId();
  const [value, setValue] = useState(current ? new URL(current).pathname : "");
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await confirmCheckoutPage(value);
      if (result.ok) toast.success("Page de paiement enregistrée. Votre tunnel est à jour.");
      else toast.error(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="mt-1">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        Page de paiement
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-cream pl-3 focus-within:border-emerald-ink focus-within:ring-4 focus-within:ring-emerald/15">
          <span className="shrink-0 text-sm text-slate">{displaySiteUrl(siteUrl)}</span>
          <Input
            id={id}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="/paiement"
            className="border-0 bg-transparent pl-1 focus-visible:ring-0"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending || !value.trim()}>
          <Icon icon={Check} /> {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
      <p className="mt-1.5 text-[13px] text-slate">
        Trouvée automatiquement par l&apos;analyse. Corrigez-la seulement si elle est fausse.
      </p>
    </form>
  );
}

export function ProjectPanel({ project }: { project: ProjectInfo }) {
  if (!project.siteUrl) {
    return (
      <Card>
        <StateMessage
          icon={Rocket}
          anim="bounce"
          title="Votre SaaS n'est pas encore relié."
          description="Deux actions suffisent : installer une ligne de script, puis connecter Stripe."
          action={
            <Button asChild>
              <Link href="/configuration">
                Terminer la configuration <Icon icon={ArrowRight} anim="nudge" />
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }
  const linked = Math.round((NADIA_CUSTOMERS * COVERAGE) / 100);

  return (
    <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardEyebrow>Votre SaaS</CardEyebrow>
        <p className="mb-5 font-serif text-xl font-semibold text-forest">
          Tout est relié, rien à régler.
        </p>
        <ul className="mb-5">
          <StatusRow icon={Globe} title="Site suivi">
            <a
              href={project.siteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-forest underline-offset-4 hover:underline"
            >
              {displaySiteUrl(project.siteUrl)}
              <Icon icon={ExternalLink} anim="nudge" className="size-3.5" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </StatusRow>
          <StatusRow icon={Link2} title="Script">
            {project.scriptDetected ? (
              <LiveDot label="Installé, visites reçues" />
            ) : (
              <Badge tone="attention" pulse>
                En attente des premières visites
              </Badge>
            )}
          </StatusRow>
          <StatusRow icon={CreditCard} title="Stripe">
            {project.stripeConnected ? (
              <Badge tone="growth">Connecté · lecture seule</Badge>
            ) : (
              <Button asChild variant="secondary" size="sm">
                <Link href="/configuration">Connecter Stripe</Link>
              </Button>
            )}
          </StatusRow>
        </ul>
        {project.siteKey && (
          <div className="mb-5">
            <p className="mb-1.5 text-sm font-semibold text-ink">Votre ligne de script</p>
            <CopyBlock snippet={scriptSnippet(project.siteKey)} onCopied={() => {}} />
          </div>
        )}
        <CheckoutForm siteUrl={project.siteUrl} current={project.checkoutUrl} />
      </Card>

      <Card>
        <CardEyebrow>Couverture</CardEyebrow>
        <AnimatedNumber
          value={COVERAGE}
          format="percent"
          className="font-serif text-[40px] leading-tight font-semibold text-forest"
        />
        <p className="mb-4 text-[15px] text-ink">
          de vos clients sont reliés à leur provenance ({linked} sur {NADIA_CUSTOMERS}).
        </p>
        <GrowBar share={COVERAGE} />
        <p className="mt-4 text-sm text-slate">
          Les autres sont arrivés avant l&apos;installation du script ou utilisent un bloqueur de
          publicité. Ce taux monte tout seul à mesure que de nouveaux clients arrivent.
        </p>
      </Card>
    </div>
  );
}
