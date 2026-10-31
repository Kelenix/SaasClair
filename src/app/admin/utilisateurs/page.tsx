import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/features/admin/admin-header";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";
import { requireSuperAdmin } from "@/features/admin/guard";
import { isOnline, monthlyRevenue } from "@/features/admin/metrics";
import { getAdminProfiles, getAdminProjects } from "@/features/admin/queries";
import { UsersTable } from "@/features/admin/users-table";
import { stepOf } from "@/features/setup/steps";

export const metadata: Metadata = { title: "Utilisateurs" };

type Props = { searchParams: Promise<{ q?: string }> };

async function AdminUsers({ searchParams }: Props) {
  const [{ user }, profiles, projects, { q }] = await Promise.all([
    requireSuperAdmin(),
    getAdminProfiles(),
    getAdminProjects(),
    searchParams,
  ]);
  const now = new Date();
  const rows = profiles.map((profile) => {
    const project = projects[profile.id];
    return {
      ...profile,
      isOnline: isOnline(profile, now),
      isTrialOver: Date.parse(profile.trial_ends_at) < now.getTime(),
      monthlyRevenue: monthlyRevenue(profile),
      siteUrl: project?.site_url ?? null,
      setupStep: stepOf(project ?? null),
    };
  });
  const online = rows.filter((row) => row.isOnline).length;

  return (
    <>
      <AdminHeader
        title="Utilisateurs"
        description={`${rows.length} comptes, dont ${online} connecté${online > 1 ? "s" : ""} en ce moment. Cliquez sur une ligne pour gérer l'abonnement, l'essai ou le rôle.`}
      />
      <UsersTable users={rows} currentAdminId={user.id} initialQuery={q?.slice(0, 200) ?? ""} />
    </>
  );
}

export default function AdminUsersPage(props: Props) {
  return (
    <Suspense fallback={<ScreenSkeleton label="Utilisateurs" />}>
      <AdminUsers {...props} />
    </Suspense>
  );
}
