import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de l'accueil : même grille que l'écran final, pour un chargement sans saut. */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Chargement de l'accueil">
      <Skeleton className="mb-3 h-11 w-64" />
      <Skeleton className="mb-8 h-4 w-full max-w-lg" />
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <Skeleton key={card} className="h-44 rounded-card" />
        ))}
      </div>
      <Skeleton className="mt-10 mb-4 h-7 w-72" />
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <Skeleton key={card} className="h-80 rounded-card" />
        ))}
      </div>
    </div>
  );
}
