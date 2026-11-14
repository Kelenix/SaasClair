"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  Globe,
  Link2,
  RefreshCw,
  Rocket,
} from "lucide-react";
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
import { confirmKeyPage } from "../actions";
import { NADIA_CUSTOMERS } from "../demo-utils";

export type ProjectInfo = {
  siteUrl: string | null;
  siteKey: string | null;
  checkoutUrl: string | null;
  scriptDetected: boolean;
  stripeConnected: boolean;
  /** Couverture réelle (clients payants reliés à leur canal), une fois Stripe connecté. */
  coverage?: { share: number; line: string } | null;
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
      const result = await confirmKeyPage("checkout", value);
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

export function ProjectPanel({ project, demo }: { project: ProjectInfo; demo: boolean }) {
  if (!project.siteUrl) {
    return (
      <Card>
        <StateMessage
          icon={Rocket}
          anim="bounce"
          title="Votre SaaS n'est pas encore relié."
          description="Deux actions suffisent : relier votre site (une ligne à coller), puis connecter Stripe."
          action={
            <Button asChild>
              <a href="/configuration?etape=site">
                Terminer la configuration <Icon icon={ArrowRight} anim="nudge" />
              </a>
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardEyebrow>Votre SaaS</CardEyebrow>
        <p className="mb-5 font-serif text-xl font-semibold text-forest">
          {project.scriptDetected && project.stripeConnected
            ? "Tout est relié, rien à régler."
            : "Votre SaaS est en place."}
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="growth">Connecté · jamais modifié</Badge>
                {/* Mauvais compte choisi chez Stripe : on en relie un autre, l'ancien est oublié. */}
                <Button asChild variant="ghost" size="sm" data-icon-trigger>
                  <a href="/api/stripe/connect">
                    <Icon icon={RefreshCw} anim="spin" />
                    Changer de compte
                  </a>
                </Button>
              </div>
            ) : (
              <Button asChild variant="secondary" size="sm">
                <a href="/configuration?etape=stripe">Connecter Stripe</a>
              </Button>
            )}
          </StatusRow>
        </ul>
        {project.siteKey && (
          <div className="mb-5">
            <p className="mb-1.5 text-sm font-semibold text-ink">Votre ligne SaasClair</p>
            <CopyBlock snippet={scriptSnippet(project.siteKey)} onCopied={() => {}} />
          </div>
        )}
        <CheckoutForm siteUrl={project.siteUrl} current={project.checkoutUrl} />
      </Card>

      {demo ? (
        <CoverageCard />
      ) : project.coverage ? (
        <RealCoverageCard coverage={project.coverage} />
      ) : (
        <NoCoverageYet />
      )}
    </div>
  );
}

/** Couverture réelle, affichée telle quelle (même à 0 %). */
function RealCoverageCard({ coverage }: { coverage: { share: number; line: string } }) {
  return (
    <Card>
      <CardEyebrow>Couverture</CardEyebrow>
      <p className="mb-3 text-[15px] text-ink">{coverage.line}</p>
      <GrowBar share={coverage.share} />
      {coverage.share < 100 && (
        <p className="mt-3 text-xs text-slate">
          Les nouveaux inscrits sont reliés seuls à leur canal ; les clients plus anciens restent
          sans provenance connue.
        </p>
      )}
    </Card>
  );
}

/** Sans données d'exemple : le taux réel n'existe qu'une fois des clients reliés. */
function NoCoverageYet() {
  return (
    <Card>
      <CardEyebrow>Couverture</CardEyebrow>
      <p className="text-[15px] text-ink">
        La part de vos clients reliés à leur provenance s&apos;affichera ici dès vos premiers
        clients.
      </p>
    </Card>
  );
}

function CoverageCard() {
  const linked = Math.round((NADIA_CUSTOMERS * COVERAGE) / 100);
  return (
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
  );
}
