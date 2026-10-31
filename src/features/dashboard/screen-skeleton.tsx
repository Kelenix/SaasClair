import { Skeleton } from "@/components/ui/skeleton";

/** Squelette commun aux écrans d'analyse : en-tête, 4 indicateurs, puis deux blocs. */
export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={`Chargement : ${label}`}>
      <Skeleton className="mb-3 h-11 w-64" />
      <Skeleton className="mb-8 h-4 w-full max-w-lg" />
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <Skeleton key={card} className="h-44 rounded-card" />
        ))}
      </div>
      <Skeleton className="mt-10 mb-4 h-7 w-72" />
      <Skeleton className="h-96 rounded-card" />
      <div className="mt-4 grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}
