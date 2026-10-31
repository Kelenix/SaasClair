import type { Metadata } from "next";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/features/admin/admin-header";
import { NewsletterList } from "@/features/admin/newsletter-list";
import { getNewsletterSubscribers } from "@/features/admin/queries";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "Newsletter" };

async function AdminNewsletter() {
  const subscribers = await getNewsletterSubscribers();
  const active = subscribers.filter((item) => !item.unsubscribed_at).length;
  return (
    <>
      <AdminHeader
        title="Newsletter"
        description={`${active} abonné${active > 1 ? "s" : ""}, inscrits depuis le pied de page du site. L'export s'importe dans Brevo, Mailchimp ou tout outil d'emailing.`}
        actions={
          <Button asChild variant="secondary">
            <a href="/admin/newsletter/export" download>
              <Icon icon={Download} anim="bounce" /> Exporter en CSV
            </a>
          </Button>
        }
      />
      <NewsletterList subscribers={subscribers} />
    </>
  );
}

export default function AdminNewsletterPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Newsletter" />}>
      <AdminNewsletter />
    </Suspense>
  );
}
