import { ArrowRight, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { StateMessage } from "@/components/states/state-message";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ActionStep } from "@/features/setup/steps";
import { ScreenPreview, type PreviewKind } from "./screen-preview";

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
  /** Dessin de l'écran à venir, clairement étiqueté (jamais de chiffres). */
  preview?: PreviewKind;
  /** Garder le dessin une fois l'étape faite (non : « rien à signaler » n'est pas un vide). */
  previewWhenWaiting?: boolean;
};

/**
 * Écran sans données : on n'invente rien. Le titre reste, puis ce qui manque, l'étape qui
 * débloque l'écran (lien <a> : voir SetupBanner), et un dessin de ce qu'il affichera.
 */
export function NoData({
  title,
  description,
  icon,
  needs,
  remaining,
  waiting,
  preview,
  previewWhenWaiting = true,
}: NoDataProps) {
  const isStepLeft = remaining.includes(needs);
  const showPreview = preview && (isStepLeft || previewWhenWaiting);
  return (
    <>
      <header className="mb-7">
        <h1 className="mb-2 text-[34px] sm:text-[42px]">{title}</h1>
      </header>
      <Card>
        <StateMessage
          icon={icon}
          title={
            isStepLeft ? "Une étape, et cet écran se remplit." : "Vos premières données arrivent."
          }
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
      {showPreview && (
        <div className="mt-4">
          <ScreenPreview kind={preview} label={`Dessin de l'écran ${title} une fois rempli.`} />
        </div>
      )}
    </>
  );
}
