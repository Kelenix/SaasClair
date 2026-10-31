import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutForm } from "@/features/admin/about-form";
import { AdminHeader } from "@/features/admin/admin-header";
import { getAdminAboutPage } from "@/features/admin/queries";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "À propos" };

async function AdminAbout() {
  const page = await getAdminAboutPage();
  return (
    <>
      <AdminHeader
        title="Page À propos"
        description="Qui vous êtes et pourquoi SaasClair existe. Le texte de départ est à relire et à compléter."
      />
      <AboutForm initial={page} />
    </>
  );
}

export default function AdminAboutPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="À propos" />}>
      <AdminAbout />
    </Suspense>
  );
}
