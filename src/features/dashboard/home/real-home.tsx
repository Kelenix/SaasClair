import {
  ArrowRight,
  Check,
  Code,
  CreditCard,
  Gauge,
  Globe,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import type { RealAcquisition } from "@/features/collect/aggregate";
import { RankedCard, visitKpis } from "@/features/collect/real-acquisition";
import type { SiteAudit } from "@/features/setup/site-analysis";
import type { RealRevenue } from "@/features/stripe/metrics";
import { hasRevenueData, revenueKpis, RiskList } from "@/features/stripe/real-views";
import { displaySiteUrl } from "@/lib/site-url";
import { auditAgeLabel } from "@/features/setup/audit-age";
import { RefreshAuditButton } from "@/features/setup/refresh-audit-button";
import { KpiCards } from "./kpi-cards";
import { RevenueChart } from "./revenue-chart";
import { SectionTitle } from "../page-header";

/** Source pas encore branchée, ou branchée sans données : une ligne claire et l'action à faire. */
function SourceHint({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string } | false;
}) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center" data-icon-trigger>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
        <Icon icon={icon} anim="pop" className="size-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-slate">{description}</p>
      </div>
      {action && (
        <Button asChild variant="secondary" size="sm" className="self-start sm:self-auto">
          {/* Lien <a> : voir SetupBanner (la configuration repart de l'étape demandée). */}
          <a href={action.href}>
            {action.label} <Icon icon={ArrowRight} anim="nudge" />
          </a>
        </Button>
      )}
    </Card>
  );
}

const PAGES: { key: keyof SiteAudit["pages"]; label: string }[] = [
  { key: "signup", label: "Inscription" },
  { key: "pricing", label: "Tarifs" },
  { key: "checkout", label: "Paiement" },
];

/** Votre site, d'après l'analyse de l'étape 0 : pages clés, vitesse, référencement, technologies. */
function SiteSummary({ siteUrl, audit }: { siteUrl: string; audit: SiteAudit }) {
  if (!audit.reachable) {
    return (
      <SourceHint
        icon={Globe}
        title={`${displaySiteUrl(siteUrl)} n'a pas répondu lors de l'analyse.`}
        description="Vérifiez que le site est en ligne, puis relancez l'analyse."
        action={{ label: "Relancer l'analyse", href: "/configuration?etape=site" }}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
      <Card>
        <CardEyebrow>Pages clés</CardEyebrow>
        <ul className="flex flex-col gap-3">
          {PAGES.map(({ key, label }) => {
            const found = audit.pages[key];
            return (
              <li key={key} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    found
                      ? "grid size-6 place-items-center rounded-full bg-emerald-tint text-emerald-ink"
                      : "grid size-6 place-items-center rounded-full bg-gold-tint text-gold-ink"
                  }
                >
                  <Icon icon={found ? Check : X} anim="pop" className="size-3.5" />
                </span>
                <span className="font-semibold text-ink">{label}</span>
                <span className="ml-auto truncate text-xs text-slate">
                  {found ? displaySiteUrl(found) : "non trouvée"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-slate">
          {audit.pageCount} page{audit.pageCount > 1 ? "s" : ""} trouvée
          {audit.pageCount > 1 ? "s" : ""} sur {displaySiteUrl(siteUrl)}.
        </p>
      </Card>

      <Card>
        <CardEyebrow>Référencement</CardEyebrow>
        <p className="mb-2 font-serif text-[34px] leading-none font-semibold text-forest tabular-nums">
          {audit.seo.score}
          <span className="text-base text-slate"> / 100</span>
        </p>
        <GrowBar share={audit.seo.score} />
        <ul className="mt-4 flex flex-col gap-1.5 text-sm">
          {audit.seo.checks.map((check) => (
            <li key={check.label} className="flex items-start gap-2">
              <Icon
                icon={check.ok ? Check : X}
                anim="pop"
                className={
                  check.ok ? "mt-0.5 size-3.5 text-emerald-ink" : "mt-0.5 size-3.5 text-gold-ink"
                }
              />
              <span>
                <span className="text-ink">{check.label}</span>
                {/* Pourquoi le point est faux : ce qui a été trouvé, et ce qu'il faut viser. */}
                {!check.ok && check.detail && (
                  <span className="block text-xs text-slate">{check.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardEyebrow>Vitesse et technologies</CardEyebrow>
        <p className="mb-1 flex items-center gap-2 font-serif text-2xl font-semibold text-forest">
          <Icon icon={Gauge} anim="tilt" className="size-5 text-emerald-ink" />
          {audit.speed ? audit.speed.charAt(0).toUpperCase() + audit.speed.slice(1) : "Inconnue"}
        </p>
        {audit.responseMs !== null && (
          <p className="mb-4 text-sm text-slate">
            Page d&apos;accueil servie en {audit.responseMs} ms.
          </p>
        )}
        <ul className="flex flex-wrap gap-1.5">
          {audit.technologies.length ? (
            audit.technologies.map((tech) => (
              <li key={tech}>
                <Badge>{tech}</Badge>
              </li>
            ))
          ) : (
            <li className="text-sm text-slate">Aucune technologie reconnue.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

type RealHomeProps = {
  /** Liste de démarrage affichée au-dessus : les cartes ne répètent pas son bouton. */
  hasSetupList?: boolean;
  siteUrl: string | null;
  audit: SiteAudit | null;
  /** Date de la dernière analyse du site. */
  auditedAt?: string | null;
  scriptDetected: boolean;
  revenue: RealRevenue | null;
  visits: RealAcquisition;
};

/**
 * Accueil sur les vraies données : revenus (Stripe), visiteurs (script) et votre site (analyse).
 * Les sections qui ont des données passent devant ; les autres disent quoi faire. Jamais vide.
 */
export function RealHome({
  hasSetupList = false,
  siteUrl,
  audit,
  auditedAt = null,
  scriptDetected,
  revenue,
  visits,
}: RealHomeProps) {
  const sections = [
    {
      id: "revenus",
      hasData: Boolean(revenue && hasRevenueData(revenue)),
      node:
        revenue && hasRevenueData(revenue) ? (
          <>
            <KpiCards kpis={revenueKpis(revenue)} />
            {revenue.buckets.some(
              (bucket) => bucket.newMrr || bucket.expansion || bucket.lost || bucket.contraction,
            ) && (
              <>
                <SectionTitle title="Évolution du revenu" />
                <RevenueChart buckets={revenue.buckets} />
              </>
            )}
            <SectionTitle title="Clients à risque" />
            <RiskList customers={revenue.atRisk} limit={3} linkToChurn />
          </>
        ) : revenue ? (
          <SourceHint
            icon={CreditCard}
            title="Stripe est connecté."
            description="Aucun abonnement pour l'instant : votre revenu, votre churn et vos clients à risque apparaîtront ici dès le premier."
          />
        ) : (
          <SourceHint
            icon={CreditCard}
            title="Revenus, churn et clients à risque"
            description="Connectez Stripe en un clic : SaasClair ne fait que lire vos données."
            action={
              !hasSetupList && { label: "Connecter Stripe", href: "/configuration?etape=stripe" }
            }
          />
        ),
    },
    {
      id: "visiteurs",
      hasData: visits.visitors > 0,
      node:
        visits.visitors > 0 ? (
          <>
            <KpiCards kpis={visitKpis(visits)} />
            <div className="mt-4 grid grid-cols-1 gap-4 @4xl:grid-cols-2">
              <RankedCard title="Canaux" rows={visits.channels.slice(0, 4)} empty="" />
              <RankedCard title="Pages d'entrée" rows={visits.landingPages.slice(0, 4)} empty="" />
            </div>
          </>
        ) : scriptDetected ? (
          <SourceHint
            icon={Users}
            title="Votre site est relié."
            description="Aucune visite sur cette période : choisissez une période plus longue, ou attendez vos prochains visiteurs."
          />
        ) : (
          <SourceHint
            icon={Code}
            title="D'où viennent vos visiteurs"
            description="Ajoutez la ligne SaasClair à votre site, une seule fois : vos visites et vos canaux apparaîtront ici."
            action={
              !hasSetupList && { label: "Relier mon site", href: "/configuration?etape=script" }
            }
          />
        ),
    },
    {
      id: "site",
      hasData: Boolean(siteUrl && audit),
      node:
        siteUrl && audit ? (
          <SiteSummary siteUrl={siteUrl} audit={audit} />
        ) : (
          <SourceHint
            icon={Globe}
            title="Votre site"
            description="Ajoutez l'adresse de votre SaaS : nous analysons ses pages clés, sa vitesse et son référencement."
            action={
              !hasSetupList && { label: "Ajouter l'adresse", href: "/configuration?etape=site" }
            }
          />
        ),
    },
  ];
  const titles: Record<string, string> = {
    revenus: "Vos revenus",
    visiteurs: "Vos visiteurs",
    site: siteUrl ? `Votre site · ${displaySiteUrl(siteUrl)}` : "Votre site",
  };

  // Les sections avec des données d'abord, dans l'ordre revenus, visiteurs, site.
  return (
    <>
      {[...sections]
        .sort((a, b) => Number(b.hasData) - Number(a.hasData))
        .map((section) => (
          <section key={section.id} aria-labelledby={`accueil-${section.id}`}>
            <SectionTitle
              title={titles[section.id]}
              id={`accueil-${section.id}`}
              detail={
                section.id === "site" && siteUrl && audit ? (
                  <RefreshAuditButton ageLabel={auditAgeLabel(auditedAt, new Date())} />
                ) : undefined
              }
            />
            {section.node}
          </section>
        ))}
    </>
  );
}

/** Résumé en une phrase, à partir de ce qui est réellement connu. */
export function realSummary(revenue: RealRevenue | null, visits: RealAcquisition) {
  const parts: string[] = [];
  if (visits.visitors > 0) {
    parts.push(`${visits.visitors} visiteur${visits.visitors > 1 ? "s" : ""} sur la période`);
  }
  if (revenue && hasRevenueData(revenue)) {
    const count = revenue.atRisk.length;
    parts.push(
      count ? `${count} client${count > 1 ? "s" : ""} à surveiller` : "aucun client à risque",
    );
  }
  return parts.length
    ? `${parts.join(", ").replace(/^./, (c) => c.toUpperCase())}.`
    : "Voici où en est votre SaaS.";
}
