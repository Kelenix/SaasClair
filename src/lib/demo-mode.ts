import "server-only";

/**
 * Données d'exemple (le SaaS de Nadia) : seulement sur le poste de développement et dans les
 * tests (`DEMO_DATA=true` dans .env). En production, la variable est absente : le tableau de
 * bord n'affiche que les données réelles de l'utilisateur, donc des écrans vides tant qu'il n'en
 * a pas. Le site vitrine, lui, garde son aperçu illustré.
 */
export const isDemoMode = () => process.env.DEMO_DATA === "true";
