"use client";

import { toast } from "sonner";
import { ChartColumn, Contact, Search, Workflow } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Cascade, CascadeItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const INTEGRATIONS = [
  {
    id: "ga4",
    name: "Google Analytics",
    detail: "Comparez vos chiffres avec ceux que vous suivez déjà.",
    icon: ChartColumn,
  },
  {
    id: "search-console",
    name: "Search Console",
    detail: "Voyez les recherches Google qui amènent vos clients payants.",
    icon: Search,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    detail: "Envoyez le score de risque de chaque client dans votre CRM.",
    icon: Contact,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    detail: "Retrouvez la provenance de chaque client dans vos affaires.",
    icon: Workflow,
  },
] as const;

/** Intégrations facultatives : des bonus, jamais nécessaires au fonctionnement. */
export function IntegrationsPanel() {
  return (
    <div>
      <p className="mb-4 max-w-2xl text-[15px] text-slate">
        Tout fonctionne déjà sans elles. Ces connexions ajoutent seulement du contexte à vos
        chiffres.
      </p>
      <Cascade className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <CascadeItem key={integration.id} className="h-full">
            <Card interactive className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-cream text-forest">
                  <Icon icon={integration.icon} anim="bounce" />
                </span>
                <Badge tone="attention">Bonus</Badge>
              </div>
              <p className="font-serif text-lg font-semibold text-forest">{integration.name}</p>
              <p className="mb-5 text-sm text-slate">{integration.detail}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-auto self-start"
                onClick={() =>
                  toast(`${integration.name} arrive bientôt.`, {
                    description: "Nous vous prévenons dès que la connexion est disponible.",
                  })
                }
              >
                Connecter
              </Button>
            </Card>
          </CascadeItem>
        ))}
      </Cascade>
    </div>
  );
}
