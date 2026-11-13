import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { listAll, type StripeConfig } from "./client";
import {
  customerCards,
  toCustomerRow,
  toInvoiceRow,
  toSubscriptionRow,
  type StripeCustomer,
  type StripeInvoice,
  type StripeProduct,
  type StripeSubscription,
} from "./normalize";

const BATCH = 500;
const DAY_S = 24 * 60 * 60;

async function upsertInBatches(
  table: "stripe_customers" | "stripe_subscriptions" | "stripe_invoices",
  rows: object[],
) {
  const service = createServiceClient()!;
  for (let i = 0; i < rows.length; i += BATCH) {
    // Lignes déjà converties au bon format par normalize.ts.
    const { error } = await service.from(table).upsert(rows.slice(i, i + BATCH) as never, {
      onConflict: "project_id,id",
    });
    if (error) throw new Error(`${table} : ${error.message}`);
  }
}

/**
 * Importe les clients, abonnements et factures (12 derniers mois) du compte Stripe connecté,
 * puis marque Stripe comme connecté. Lancé après la connexion (et plus tard, à chaque resynchro).
 */
export async function syncStripeAccount(config: StripeConfig, projectId: string, account: string) {
  const service = createServiceClient();
  if (!service) return;
  await service.from("projects").update({ stripe_sync_status: "importing" }).eq("id", projectId);
  try {
    const since = Math.floor(Date.now() / 1000) - 365 * DAY_S;
    const [customers, subscriptions, invoices, products] = await Promise.all([
      // Moyens de paiement dépliés : seul le mois d'expiration des cartes est gardé (risque de
      // paiement échoué au prochain renouvellement).
      listAll<StripeCustomer>(config, account, "/v1/customers", {
        "expand[]": "data.invoice_settings.default_payment_method",
      }),
      listAll<StripeSubscription>(config, account, "/v1/subscriptions", {
        status: "all",
        "expand[]": "data.default_payment_method",
      }),
      listAll<StripeInvoice>(config, account, "/v1/invoices", { "created[gte]": String(since) }),
      listAll<StripeProduct>(config, account, "/v1/products"),
    ]);
    const productNames = new Map(
      products.flatMap((product) => (product.name ? [[product.id, product.name] as const] : [])),
    );
    await upsertInBatches(
      "stripe_customers",
      customers.filter((customer) => !customer.deleted).map((c) => toCustomerRow(projectId, c)),
    );
    const cards = customerCards(customers);
    await upsertInBatches(
      "stripe_subscriptions",
      subscriptions.map((subscription) =>
        toSubscriptionRow(projectId, subscription, productNames, cards),
      ),
    );
    await upsertInBatches(
      "stripe_invoices",
      invoices.map((invoice) => toInvoiceRow(projectId, invoice)),
    );
    const now = new Date().toISOString();
    await service
      .from("projects")
      .update({ stripe_sync_status: "done", stripe_synced_at: now, stripe_connected_at: now })
      .eq("id", projectId);
  } catch (error) {
    console.error("Import Stripe :", error instanceof Error ? error.message : error);
    await service.from("projects").update({ stripe_sync_status: "error" }).eq("id", projectId);
  }
}

/**
 * Resynchronisation de tous les comptes Stripe connectés, l'un après l'autre (lancée chaque heure
 * par le serveur : deploy/scripts/stripe-sync.sh). Les écrans gardent les données précédentes
 * pendant l'import.
 */
export async function syncAllStripeAccounts(config: StripeConfig) {
  const service = createServiceClient();
  if (!service) return 0;
  const { data: projects } = await service
    .from("projects")
    .select("id, stripe_account_id")
    .not("stripe_account_id", "is", null);
  for (const project of projects ?? []) {
    await syncStripeAccount(config, project.id, project.stripe_account_id!);
  }
  return projects?.length ?? 0;
}
