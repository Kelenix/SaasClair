// Onglets des paramètres, partagés par la page (serveur) et les onglets (navigateur).
export const SETTINGS_TABS = [
  { id: "projet", label: "Projet" },
  { id: "equipe", label: "Équipe et rôles" },
  { id: "abonnement", label: "Abonnement" },
  { id: "confidentialite", label: "Confidentialité" },
  { id: "integrations", label: "Intégrations" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];
