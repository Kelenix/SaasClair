import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardEyebrow } from "@/components/ui/card";
import { AdminHeader } from "@/features/admin/admin-header";
import { requireSuperAdmin } from "@/features/admin/guard";
import {
  getAdminProfiles,
  getAdminSiteSettings,
  getAuditLog,
  getSystemStats,
} from "@/features/admin/queries";
import { SectionTitle } from "@/features/dashboard/page-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import packageJson from "../../../../package.json";

export const metadata: Metadata = { title: "État du système" };

type CheckState = "ok" | "todo" | "error";

const STATE_ICON = { ok: CircleCheck, todo: CircleDashed, error: CircleX } as const;
const STATE_STYLE = {
  ok: "bg-emerald-tint text-emerald-ink",
  todo: "bg-sand text-slate",
  error: "bg-danger-tint text-danger",
} as const;

const TABLE_LABELS: Record<string, string> = {
  profiles: "Comptes",
  projects: "Sites suivis",
  insight_feedback: "Suivis d'insights",
  alert_settings: "Réglages d'alertes",
  newsletter_subscribers: "Abonnés newsletter",
  faq_items: "Questions de la FAQ",
  testimonials: "Témoignages",
  admin_audit_log: "Actions journalisées",
};

const ACTION_LABELS: Record<string, string> = {
  "abonnement.modifie": "Abonnement modifié",
  "essai.prolonge": "Essai prolongé",
  "role.donne": "Rôle d'administrateur donné",
  "role.retire": "Rôle d'administrateur retiré",
  "compte.supprime": "Compte supprimé",
  "reglages.modifies": "Réglages du site modifiés",
  "newsletter.export": "Export de la newsletter",
  "newsletter.desinscrit": "Abonné désinscrit",
  "newsletter.reinscrit": "Abonné réinscrit",
  "newsletter.supprime": "Abonné effacé",
  "page.a-propos.modifiee": "Page À propos modifiée",
};
const actionLabel = (action: string) =>
  ACTION_LABELS[action] ??
  action
    .replace(/^faq\./, "FAQ : ")
    .replace(/^testimonial\./, "Témoignage : ")
    .replace("ajoute", "ajouté")
    .replace("modifie", "modifié")
    .replace("supprime", "supprimé")
    .replace("publie", "publié")
    .replace("masque", "masqué");

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

function Check({ state, title, detail }: { state: CheckState; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0">
      <span
        className={cn("grid size-9 shrink-0 place-items-center rounded-full", STATE_STYLE[state])}
      >
        <Icon icon={STATE_ICON[state]} anim="pop" className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="block text-[13px] text-slate">{detail}</span>
      </span>
    </li>
  );
}

const megabytes = (bytes: number) => `${formatNumber(Math.round(bytes / 1024 / 1024))} Mo`;

async function AdminSystem() {
  const [{ user }, system, settings, audit, profiles] = await Promise.all([
    requireSuperAdmin(),
    getSystemStats(),
    getAdminSiteSettings(),
    getAuditLog(),
    getAdminProfiles(),
  ]);
  const emails = Object.fromEntries(profiles.map((profile) => [profile.id, profile.email]));
  const pixels = [
    settings?.google_ads_id,
    settings?.ga4_id,
    settings?.meta_pixel_id,
    settings?.linkedin_partner_id,
  ].filter(Boolean).length;
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <>
      <AdminHeader
        title="État du système"
        description="Contrôles faits à l'ouverture de la page. Rechargez pour les relancer."
      />

      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <Card>
          <CardEyebrow>Fonctionnement</CardEyebrow>
          <ul className="mt-3">
            <Check
              state={system.databaseOk ? "ok" : "error"}
              title="Base de données"
              detail={
                system.databaseOk
                  ? `Répond en ${system.databaseMs} ms · PostgreSQL ${system.stats?.postgres_version ?? ""} · ${megabytes(system.stats?.database_size ?? 0)}`
                  : "Ne répond pas. Vérifiez Supabase."
              }
            />
            <Check
              state="ok"
              title="Authentification"
              detail={`Session vérifiée pour ${user.email}`}
            />
            <Check
              state="ok"
              title="Application"
              detail={`Next.js ${packageJson.dependencies.next} · React ${packageJson.dependencies.react} · Node ${process.version} · ${isProduction ? "production" : "développement"}`}
            />
            <Check
              state={process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "todo"}
              title="Clé de service (côté serveur)"
              detail={
                process.env.SUPABASE_SERVICE_ROLE_KEY
                  ? "Présente : la suppression de comptes est possible."
                  : "Absente : la suppression de comptes est indisponible."
              }
            />
          </ul>
        </Card>

        <Card>
          <CardEyebrow>Intégrations</CardEyebrow>
          <ul className="mt-3">
            <Check
              state="todo"
              title="Facturation Stripe"
              detail="Pas encore branchée : les abonnements se gèrent à la main depuis les fiches utilisateurs."
            />
            <Check
              state={isProduction ? "todo" : "ok"}
              title="Envoi d'emails"
              detail={
                isProduction
                  ? "Service d'envoi à configurer dans Supabase (confirmation, mot de passe oublié)."
                  : "Local : emails capturés par Mailpit (http://127.0.0.1:55324)."
              }
            />
            <Check
              state={pixels ? "ok" : "todo"}
              title="Pixels publicitaires"
              detail={
                pixels
                  ? `${pixels} outil${pixels > 1 ? "s" : ""} branché${pixels > 1 ? "s" : ""}, après consentement.`
                  : "Aucun : à renseigner dans Paramètres."
              }
            />
            <Check
              state={settings?.contact_email ? "ok" : "todo"}
              title="Email de contact"
              detail={settings?.contact_email ?? "À renseigner dans Paramètres."}
            />
          </ul>
        </Card>
      </div>

      <SectionTitle title="Données" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardEyebrow>Volume par table</CardEyebrow>
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm @3xl:grid-cols-2">
            {Object.entries(system.stats?.tables ?? {}).map(([table, count]) => (
              <div key={table} className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-ink">{TABLE_LABELS[table] ?? table}</dt>
                <dd className="font-semibold text-forest tabular-nums">{formatNumber(count)}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardEyebrow>Migrations appliquées</CardEyebrow>
          <p className="mb-3 font-serif text-xl font-semibold text-forest">
            {system.stats?.migrations.length ?? 0} évolutions du schéma
          </p>
          <ul className="flex flex-wrap gap-2">
            {(system.stats?.migrations ?? []).map((version) => (
              <li key={version}>
                <Badge className="font-mono text-[11px]">{version}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <SectionTitle
        title="Journal d'activité"
        detail={
          <p className="text-sm text-slate">Les 40 dernières actions des super administrateurs.</p>
        }
      />
      <Card className="overflow-hidden p-0">
        {audit.length === 0 ? (
          <p className="p-6 text-sm text-slate">Aucune action pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-line">
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{actionLabel(entry.action)}</span>
                  <span className="block truncate text-xs text-slate">
                    par {entry.actor_id ? (emails[entry.actor_id] ?? "compte supprimé") : "—"}
                    {entry.target && ` · ${emails[entry.target] ?? entry.target}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate">
                  {DATE_TIME.format(new Date(entry.created_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AdminSystemPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="État du système" />}>
      <AdminSystem />
    </Suspense>
  );
}
