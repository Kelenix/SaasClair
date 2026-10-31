import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { StateMessage } from "@/components/states/state-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="flex flex-col items-center">
        <Link href="/" aria-label="SaasClair, accueil" className="mb-8 rounded-md">
          <Logo />
        </Link>
        <StateMessage
          icon={Compass}
          anim="spin"
          title="Cette page n'existe pas."
          description="Le lien est peut-être ancien, ou la page arrive bientôt. Revenez à l'accueil, tout le reste fonctionne."
          action={
            <Button asChild>
              <Link href="/">Retour à l&apos;accueil</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
