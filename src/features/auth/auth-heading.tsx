import { Skeleton } from "@/components/ui/skeleton";

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-8">
      <h1 className="mb-2 text-[34px] sm:text-[40px]">{title}</h1>
      <p className="text-[15px] text-slate sm:text-base">{subtitle}</p>
    </header>
  );
}

/** Squelette affiché le temps de lire l'adresse de la page (paramètres d'URL). */
export function AuthFormSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement du formulaire">
      <Skeleton className="h-12 rounded-full" />
      <Skeleton className="h-12 rounded-full" />
      <Skeleton className="mt-4 h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="mt-2 h-14 rounded-full" />
    </div>
  );
}
