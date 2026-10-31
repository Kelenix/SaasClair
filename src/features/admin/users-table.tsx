"use client";

import { useMemo, useState } from "react";
import { m } from "motion/react";
import { Search, SearchX } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CHANNEL_LABELS, CHANNELS } from "@/features/attribution/attribution";
import { formatEuro } from "@/lib/format";
import { cascade, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  INTERVAL_LABELS,
  PAYMENT_LABELS,
  PLAN_LABELS,
  STATUS_LABELS,
  type AdminProfile,
} from "./metrics";
import { channelLabel, lastActivity, StatusBadge } from "./user-format";
import { UserSheet } from "./user-sheet";

export type AdminUserRow = AdminProfile & {
  isOnline: boolean;
  isTrialOver: boolean;
  monthlyRevenue: number;
  siteUrl: string | null;
  setupStep: "site" | "script" | "stripe" | "done";
};

const PAGE_SIZE = 40;
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return isOnline ? (
    <span className="pulse-ring size-2 shrink-0 rounded-full bg-emerald text-emerald">
      <span className="sr-only">Connecté</span>
    </span>
  ) : null;
}

/** Liste de tous les utilisateurs : recherche, filtres et fiche détaillée au clic. */
export function UsersTable({
  users,
  currentAdminId,
  initialQuery = "",
}: {
  users: AdminUserRow[];
  currentAdminId: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [channel, setChannel] = useState("all");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter(
      (user) =>
        (!needle ||
          user.email.toLowerCase().includes(needle) ||
          user.first_name.toLowerCase().includes(needle) ||
          (user.signup_campaign ?? "").toLowerCase().includes(needle)) &&
        (status === "all" || user.subscription_status === status) &&
        (plan === "all" || user.plan === plan) &&
        (channel === "all" || user.signup_channel === channel) &&
        (!onlineOnly || user.isOnline),
    );
  }, [users, query, status, plan, channel, onlineOnly]);
  const visible = filtered.slice(0, limit);
  const selected = users.find((user) => user.id === selectedId);
  const open = (id: string) => {
    setSelectedId(id);
    setIsOpen(true);
  };
  const reset = () => {
    setQuery("");
    setStatus("all");
    setPlan("all");
    setChannel("all");
    setOnlineOnly(false);
  };

  return (
    <>
      <Card className="mb-4 grid grid-cols-1 gap-3 p-4 @3xl:grid-cols-[1.5fr_repeat(3,1fr)_auto]">
        <label className="relative block">
          <span className="sr-only">Rechercher un utilisateur</span>
          <Icon
            icon={Search}
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nom, email ou campagne…"
            className="h-11 pl-10"
          />
        </label>
        <NativeSelect
          aria-label="Statut"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Offre"
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
        >
          <option value="all">Toutes les offres</option>
          {Object.entries(PLAN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Canal d'arrivée"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
        >
          <option value="all">Tous les canaux</option>
          {CHANNELS.map((value) => (
            <option key={value} value={value}>
              {CHANNEL_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant={onlineOnly ? "primary" : "secondary"}
          size="sm"
          aria-pressed={onlineOnly}
          onClick={() => setOnlineOnly((value) => !value)}
          className="h-11"
        >
          <span className="size-2 rounded-full bg-emerald" aria-hidden /> Connectés
        </Button>
      </Card>

      <p className="mb-3 text-sm text-slate" role="status">
        {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""}
        {filtered.length !== users.length && ` sur ${users.length}`}
      </p>

      {filtered.length === 0 ? (
        <Card>
          <StateMessage
            icon={SearchX}
            anim="wiggle"
            title="Aucun utilisateur ne correspond."
            description="Changez la recherche ou les filtres."
            action={
              <Button variant="secondary" size="sm" onClick={reset}>
                Tout afficher
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="hidden w-full text-left text-sm @5xl:table">
            <thead className="border-b border-line bg-cream/60 text-xs text-slate">
              <tr>
                {[
                  "Utilisateur",
                  "Provenance",
                  "Offre",
                  "Paiement",
                  "Statut",
                  "Inscrit le",
                  "Activité",
                ].map((label, index) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn("py-3 font-semibold", index === 0 && "pl-6")}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <m.tbody variants={cascade} initial="hidden" animate="show">
              {visible.map((user) => (
                <m.tr
                  key={user.id}
                  variants={fadeUp}
                  onClick={() => open(user.id)}
                  className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-cream/70"
                >
                  <td className="max-w-64 py-3 pl-6">
                    <span className="flex items-center gap-2">
                      <OnlineDot isOnline={user.isOnline} />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          open(user.id);
                        }}
                        className="min-w-0 rounded-md text-left outline-none focus-visible:outline-2 focus-visible:outline-emerald-ink"
                      >
                        <span className="block truncate font-semibold text-ink">
                          {user.first_name || "Sans prénom"}
                          {user.role === "super_admin" && (
                            <Badge tone="brand" className="ml-2 align-middle text-[10px]">
                              Admin
                            </Badge>
                          )}
                        </span>
                        <span className="block truncate text-xs text-slate">{user.email}</span>
                      </button>
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="block text-ink">{channelLabel(user.signup_channel)}</span>
                    <span className="block max-w-40 truncate text-xs text-slate">
                      {user.signup_campaign ?? user.signup_source ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="block text-ink">{PLAN_LABELS[user.plan]}</span>
                    <span className="block text-xs text-slate">
                      {user.monthlyRevenue ? `${formatEuro(user.monthlyRevenue)} / mois` : "—"}
                      {user.billing_interval && ` · ${INTERVAL_LABELS[user.billing_interval]}`}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-ink">
                    {user.payment_method ? PAYMENT_LABELS[user.payment_method] : "—"}
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={user.subscription_status} />
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap text-slate">
                    {DATE.format(new Date(user.created_at))}
                  </td>
                  <td className="py-3 pr-6 whitespace-nowrap text-slate" suppressHydrationWarning>
                    {user.isOnline ? (
                      <span className="font-semibold text-emerald-ink">En ligne</span>
                    ) : (
                      lastActivity(user.last_seen_at ?? user.last_sign_in_at)
                    )}
                  </td>
                </m.tr>
              ))}
            </m.tbody>
          </table>

          <m.ul
            className="divide-y divide-line @5xl:hidden"
            variants={cascade}
            initial="hidden"
            animate="show"
          >
            {visible.map((user) => (
              <m.li key={user.id} variants={fadeUp}>
                <button
                  type="button"
                  onClick={() => open(user.id)}
                  className="w-full p-4 text-left outline-none hover:bg-cream/60 focus-visible:bg-cream/60"
                >
                  <span className="mb-2 flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold text-ink">
                        <OnlineDot isOnline={user.isOnline} />
                        <span className="truncate">{user.first_name || "Sans prénom"}</span>
                      </span>
                      <span className="block truncate text-xs text-slate">{user.email}</span>
                    </span>
                    <StatusBadge status={user.subscription_status} />
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-slate">
                    <span>{channelLabel(user.signup_channel)}</span>
                    <span>
                      {PLAN_LABELS[user.plan]}
                      {user.monthlyRevenue > 0 && ` · ${formatEuro(user.monthlyRevenue)} / mois`}
                    </span>
                    {user.payment_method && <span>{PAYMENT_LABELS[user.payment_method]}</span>}
                  </span>
                </button>
              </m.li>
            ))}
          </m.ul>
        </Card>
      )}

      {filtered.length > limit && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
            Afficher {Math.min(PAGE_SIZE, filtered.length - limit)} de plus
          </Button>
        </div>
      )}

      <UserSheet
        user={selected}
        open={isOpen}
        onOpenChange={setIsOpen}
        isSelf={selected?.id === currentAdminId}
      />
    </>
  );
}
