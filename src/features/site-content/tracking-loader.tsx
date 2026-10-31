import { Tracking } from "./consent";
import { getPublicSettings, hasTrackers } from "./queries";

/** Rien n'est rendu tant qu'aucun outil publicitaire n'est branché dans l'espace administrateur. */
export async function TrackingLoader({ conversion = false }: { conversion?: boolean }) {
  const settings = await getPublicSettings();
  if (!hasTrackers(settings)) return null;
  return <Tracking settings={settings} conversion={conversion} />;
}
