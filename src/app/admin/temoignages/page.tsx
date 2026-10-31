import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/features/admin/admin-header";
import { ContentManager } from "@/features/admin/content-manager";
import { getAdminTestimonials } from "@/features/admin/queries";
import { ScreenSkeleton } from "@/features/dashboard/screen-skeleton";

export const metadata: Metadata = { title: "Témoignages" };

async function AdminTestimonials() {
  const items = await getAdminTestimonials();
  return (
    <>
      <AdminHeader
        title="Témoignages"
        description="Seuls des témoignages réels, avec l'accord de leur auteur, peuvent être publiés. Sans témoignage publié, la section disparaît du site."
      />
      <ContentManager
        kind="testimonial"
        items={items}
        singular="témoignage"
        addLabel="Ajouter un témoignage"
        emptyText="Aucun témoignage pour l'instant."
        titleKey="author"
        detailKey="quote"
        fields={[
          { name: "quote", label: "Témoignage", max: 600, multiline: true },
          { name: "author", label: "Nom (ex. : Camille R.)", max: 80 },
          { name: "role", label: "Fonction et entreprise", max: 120, optional: true },
        ]}
      />
    </>
  );
}

export default function AdminTestimonialsPage() {
  return (
    <Suspense fallback={<ScreenSkeleton label="Témoignages" />}>
      <AdminTestimonials />
    </Suspense>
  );
}
