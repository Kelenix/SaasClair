import { ArrowRight, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ActionStep } from "@/features/setup/steps";

const STEP_ACTIONS: Record<ActionStep, string> = {
  site: "Ajouter l'adresse de mon SaaS",
  script: "Relier mon site",
  stripe: "Connecter Stripe",
};

type NoDataProps = {
  title: string;
  /** Ce qui manque, et ce qui apparaîtra ici. */
  description: string;
  icon: LucideIcon;
  /** Étape dont dépendent ces chiffres : bouton direct tant qu'elle n'est pas faite. */
  needs: ActionStep;
  remaining: ActionStep[];
  /** Message une fois l'étape faite, en attendant les premières données. */
  waiting: string;
};

/**
 * Écran sans données : on n'invente rien. Le titre reste, puis ce qui manque et l'étape qui
 * débloque l'écran (lien <a> : voir SetupBanner).
 */
export function NoData({ title, description, icon, needs, remaining, waiting }: NoDataProps) {
  const isStepLeft = remaining.includes(needs);
  return (
    <>
      <header className="mb-7">
        <h1 className="mb-2 text-[34px] sm:text-[42px]">{title}</h1>
      </header>
      <Card>
        <StateMessage
          icon={icon}
          title="Pas encore de données."
          description={isStepLeft ? description : waiting}
          action={
            isStepLeft && (
              <Button asChild>
                <a href={`/configuration?etape=${needs}`}>
                  {STEP_ACTIONS[needs]} <Icon icon={ArrowRight} anim="nudge" />
                </a>
              </Button>
            )
          }
        />
      </Card>
    </>
  );
}
