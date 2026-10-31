import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/features/admin/admin-header";
import { getAdminSiteSettings } from "@/features/admin/queries";
import { SettingsForm } from "@/features/admin/settings-form";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "Paramètres" };

async function AdminSettings() {
  const settings = await getAdminSiteSettings();
  return (
    <>
      <AdminHeader
        title="Paramètres du site"
        description="Branchez vos outils publicitaires pour suivre vos campagnes et vos inscriptions. Collez seulement l'identifiant : SaasClair installe le reste."
      />
      <SettingsForm
        initial={{
          googleAdsId: settings?.google_ads_id ?? "",
          googleAdsConversionLabel: settings?.google_ads_conversion_label ?? "",
          ga4Id: settings?.ga4_id ?? "",
          metaPixelId: settings?.meta_pixel_id ?? "",
          linkedinPartnerId: settings?.linkedin_partner_id ?? "",
          contactEmail: settings?.contact_email ?? "",
        }}
      />
    </>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Paramètres" />}>
      <AdminSettings />
    </Suspense>
  );
}
