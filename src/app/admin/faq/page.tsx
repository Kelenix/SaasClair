import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/features/admin/admin-header";
import { ContentManager } from "@/features/admin/content-manager";
import { getAdminFaq } from "@/features/admin/queries";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "FAQ" };

async function AdminFaq() {
  const items = await getAdminFaq();
  return (
    <>
      <AdminHeader
        title="Questions fréquentes"
        description="Les questions affichées sur le site vitrine, dans cet ordre. Réponses courtes, sans jargon."
      />
      <ContentManager
        kind="faq"
        items={items}
        singular="élément"
        addLabel="Ajouter une question"
        emptyText="Aucune question pour l'instant."
        titleKey="question"
        detailKey="answer"
        fields={[
          { name: "question", label: "Question", max: 200 },
          { name: "answer", label: "Réponse", max: 1200, multiline: true },
        ]}
      />
    </>
  );
}

export default function AdminFaqPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="FAQ" />}>
      <AdminFaq />
    </Suspense>
  );
}
