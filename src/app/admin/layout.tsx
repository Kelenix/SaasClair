import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveDot } from "@/components/data/live-dot";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMobileNav, AdminSidebar } from "@/features/admin/admin-nav";
import { requireSuperAdmin } from "@/features/admin/guard";
import { isOnline } from "@/features/admin/metrics";
import { getAdminProfiles } from "@/features/admin/queries";
import { ProfileMenu } from "@/features/dashboard/topbar-menus";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration SaasClair" },
  robots: { index: false },
};

async function AdminShell({ children }: { children: React.ReactNode }) {
  const [{ user, profile }, profiles] = await Promise.all([
    requireSuperAdmin(),
    getAdminProfiles(),
  ]);
  const now = new Date();
  const customers = profiles.filter((item) => item.role !== "super_admin");
  const counts = {
    pastDue: customers.filter((item) => item.subscription_status === "past_due").length,
    online: customers.filter((item) => isOnline(item, now)).length,
  };

  return (
    <div className="flex min-h-dvh bg-cream">
      <AdminSidebar counts={counts} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line/70 bg-cream/90 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <AdminMobileNav counts={counts} />
          <p className="font-serif text-lg font-semibold text-forest lg:hidden">Administration</p>
          <div className="ml-auto flex items-center gap-3">
            <LiveDot
              label={`${counts.online} connecté${counts.online > 1 ? "s" : ""}`}
              className="hidden sm:inline-flex"
            />
            <ProfileMenu firstName={profile?.first_name ?? ""} email={user.email ?? ""} />
          </div>
        </header>
        <main id="contenu" className="@container flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div
      className="flex min-h-dvh bg-cream"
      aria-busy="true"
      aria-label="Chargement de l'administration"
    >
      <div className="hidden w-64 shrink-0 border-r border-line bg-white lg:block" />
      <div className="flex-1 p-6 lg:p-10">
        <Skeleton className="mb-3 h-10 w-72" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-40 rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
