// Rejoué à chaque navigation entre connexion, inscription et mot de passe : transition douce.
// Animation CSS (et non JavaScript) : le formulaire est visible dès le premier affichage, même
// avant le chargement du JavaScript. Fondu seul si « réduire les animations » est demandé.
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in duration-400 ease-out fade-in-0 slide-in-from-bottom-3 motion-reduce:slide-in-from-bottom-0">
      {children}
    </div>
  );
}
