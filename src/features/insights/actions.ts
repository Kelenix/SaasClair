"use server";

import type { Answer } from "@/features/dashboard/answers";
import { getUser } from "@/lib/supabase/server";
import { answerFromFacts } from "./answers";
import { buildInsights } from "./engine";
import { getInsightFacts } from "./queries";

const MAX_QUESTION = 300;

/** Barre de question : réponse rédigée à partir des vraies données du compte connecté. */
export async function askQuestion(question: string): Promise<Answer | null> {
  const user = await getUser();
  if (!user || typeof question !== "string") return null;
  const text = question.trim().slice(0, MAX_QUESTION);
  if (!text) return null;
  const facts = await getInsightFacts();
  return answerFromFacts(text, facts, buildInsights(facts));
}

export type Alert = {
  id: string;
  kind: "payment" | "churn" | "conversion" | "site" | "acquisition";
  title: string;
  detail: string;
  href: string;
};

const KIND: Record<string, Alert["kind"]> = {
  paiements: "payment",
  cartes: "payment",
  departs: "churn",
  "churn-hausse": "churn",
  dependance: "payment",
  essais: "conversion",
  site: "site",
  canal: "acquisition",
};

/** Alertes du menu : les insights du moment, en une ligne chacun. */
export async function loadAlerts(): Promise<Alert[]> {
  const user = await getUser();
  if (!user) return [];
  const facts = await getInsightFacts();
  return buildInsights(facts)
    .slice(0, 5)
    .map((insight) => ({
      id: insight.id,
      kind: KIND[Object.keys(KIND).find((prefix) => insight.id.startsWith(prefix)) ?? ""] ?? "site",
      title: insight.title.replace(/\.$/, ""),
      detail: insight.impact,
      href: insight.href,
    }));
}
