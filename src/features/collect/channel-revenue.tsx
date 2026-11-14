import { Link2 } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { GrowBar } from "@/components/data/grow-bar";
import { Card, CardEyebrow } from "@/components/ui/card";
import { CopyBlock } from "@/features/setup/step-script";
import { formatEuro, formatPercent } from "@/lib/format";
import { STAGGER } from "@/lib/motion";
import type { CustomerLinks } from "./linking";

/** La ligne qui relie un inscrit à sa visite : à placer juste après l'inscription réussie. */
export const IDENTIFY_SNIPPET = `saasclair("identify", emailDuNouvelInscrit);`;

/** Couverture affichée honnêtement : « 3 clients payants sur 4 (75 %) ». */
export const coverageLine = (links: CustomerLinks) =>
  `${formatPercent(links.coverage)} de vos clients payants sont reliés à leur provenance (${links.linked} sur ${links.paying}).`;

/** Ce que chaque canal rapporte vraiment : revenu mensuel des clients reliés, par canal d'arrivée. */
export function ChannelRevenue({ links }: { links: CustomerLinks }) {
  if (!links.linked) {
    return (
      <Card>
        <CardEyebrow>Revenu par canal</CardEyebrow>
        <p className="mb-2 flex items-center gap-2 font-serif text-xl font-semibold text-forest">
          <Icon icon={Link2} anim="wiggle" className="size-5 text-emerald-ink" />
          Reliez vos clients à leur canal d&apos;arrivée.
        </p>
        <p className="mb-4 text-sm text-slate">
          {links.paying
            ? `0 % de vos ${links.paying} clients payants sont reliés pour l'instant. `
            : ""}
          Le script relie seul chaque inscrit à son canal, dès qu&apos;il remplit le formulaire
          d&apos;inscription de votre site : rien à faire. Les clients apparaîtront ici à leurs
          prochaines inscriptions. Votre inscription n&apos;utilise pas de formulaire classique ?
          Ajoutez cette ligne là où le compte est créé. L&apos;email n&apos;est jamais envoyé en
          clair : seule son empreinte quitte le navigateur.
        </p>
        <CopyBlock snippet={IDENTIFY_SNIPPET} />
      </Card>
    );
  }
  const max = Math.max(...links.byChannel.map((channel) => channel.mrr), 1);
  return (
    <Card>
      <CardEyebrow>Revenu par canal</CardEyebrow>
      <ul className="flex flex-col gap-3">
        {links.byChannel.map((channel, index) => (
          <li key={channel.id}>
            <p className="mb-1 flex justify-between gap-3 text-sm">
              <span className="text-ink">
                {channel.name}
                <span className="text-xs text-slate">
                  {" "}
                  · {channel.customers} client{channel.customers > 1 ? "s" : ""}
                </span>
              </span>
              <span className="font-semibold text-forest tabular-nums">
                {formatEuro(channel.mrr)} / mois
              </span>
            </p>
            <GrowBar share={(channel.mrr / max) * 100} delay={index * STAGGER} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate">{coverageLine(links)}</p>
    </Card>
  );
}
