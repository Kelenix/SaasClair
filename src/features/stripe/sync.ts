import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getObject, listAll, readTarget, type StripeConfig } from "./client";
import {
  changesOf,
  customerCards,
  toCustomerRow,
  toInvoiceRow,
  toSubscriptionRow,
  type StripeCoupon,
  type StripeCustomer,
  type StripeEvent,
  type StripeInvoice,
  type StripeProduct,
  type StripeSubscription,
} from "./normalize";

const BATCH = 500;
const DAY_S = 24 * 60 * 60;
/** Factures importées : 13 mois et plus, pour l'historique du revenu sur 12 mois. */
const INVOICE_DAYS = 400;
/** Import complet au moins une fois par jour : il rattrape tout ce que le suivi aurait manqué. */
const FULL_EVERY_MS = 24 * 60 * 60 * 1000;
/** Au-delà de ce nombre d'objets changés, un import complet coûte moins d'appels. */
const MAX_CHANGES = 300;
/** Recouvrement entre deux suivis : un changement à la frontière n'est jamais perdu. */
const OVERLAP_S = 5 * 60;

// Ce qui fait bouger les chiffres : clients (et leur carte), abonnements, factures.
export const TRACKED_EVENTS = [
  "customer.created",
  "customer.updated",
  "customer.deleted",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.created",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.updated",
  "invoice.voided",
  "invoice.marked_uncollectible",
  "payment_method.attached",
  "payment_method.updated",
  "payment_method.automatically_updated",
];

const CUSTOMER_EXPAND = "invoice_settings.default_payment_method";
const SUBSCRIPTION_EXPAND = ["default_payment_method", "discounts"];

type Table = "stripe_customers" | "stripe_subscriptions" | "stripe_invoices";

async function upsertInBatches(table: Table, rows: object[]) {
  const service = createServiceClient()!;
  for (let i = 0; i < rows.length; i += BATCH) {
    // Lignes déjà converties au bon format par normalize.ts.
    const { error } = await service.from(table).upsert(rows.slice(i, i + BATCH) as never, {
      onConflict: "project_id,id",
    });
    if (error) throw new Error(`${table} : ${error.message}`);
  }
}

/** Noms des offres et bons de réduction du compte : petits, relus à chaque fois. */
async function referenceData(config: StripeConfig, account: string) {
  const [products, coupons] = await Promise.all([
    listAll<StripeProduct>(config, account, "/v1/products"),
    listAll<StripeCoupon>(config, account, "/v1/coupons"),
  ]);
  return {
    productNames: new Map(
      products.flatMap((product) => (product.name ? [[product.id, product.name] as const] : [])),
    ),
    coupons: new Map(coupons.map((coupon) => [coupon.id, coupon])),
  };
}

async function saveAll(
  projectId: string,
  data: {
    customers: StripeCustomer[];
    subscriptions: StripeSubscription[];
    invoices: StripeInvoice[];
    reference: Awaited<ReturnType<typeof referenceData>>;
  },
) {
  const now = Date.now();
  await upsertInBatches(
    "stripe_customers",
    data.customers.filter((c) => !c.deleted).map((c) => toCustomerRow(projectId, c)),
  );
  const cards = customerCards(data.customers);
  await upsertInBatches(
    "stripe_subscriptions",
    data.subscriptions.map((subscription) =>
      toSubscriptionRow(projectId, subscription, { ...data.reference, cards, now }),
    ),
  );
  await upsertInBatches(
    "stripe_invoices",
    data.invoices.map((invoice) => toInvoiceRow(projectId, invoice)),
  );
}

/**
 * Import complet : clients, abonnements (tous, depuis toujours) et factures des 13 derniers
 * mois. Lancé à la connexion, puis une fois par jour ; les écrans gardent les données
 * précédentes pendant l'import.
 */
export async function syncStripeAccount(
  config: StripeConfig,
  projectId: string,
  connected: string,
) {
  const service = createServiceClient();
  if (!service) return;
  const startedAt = new Date().toISOString();
  await service.from("projects").update({ stripe_sync_status: "importing" }).eq("id", projectId);
  try {
    const account = await readTarget(config, connected);
    const since = Math.floor(Date.now() / 1000) - INVOICE_DAYS * DAY_S;
    const [customers, subscriptions, invoices, reference] = await Promise.all([
      // Moyens de paiement dépliés : seul le mois d'expiration des cartes est gardé (risque de
      // paiement échoué au prochain renouvellement).
      listAll<StripeCustomer>(config, account, "/v1/customers", {
        "expand[]": `data.${CUSTOMER_EXPAND}`,
      }),
      listAll<StripeSubscription>(config, account, "/v1/subscriptions", {
        status: "all",
        "expand[]": SUBSCRIPTION_EXPAND.map((path) => `data.${path}`),
      }),
      listAll<StripeInvoice>(config, account, "/v1/invoices", { "created[gte]": String(since) }),
      referenceData(config, account),
    ]);
    await saveAll(projectId, { customers, subscriptions, invoices, reference });
    await service
      .from("projects")
      .update({
        stripe_sync_status: "done",
        // Le suivi suivant repartira du début de cet import : rien ne passe entre les deux.
        stripe_synced_at: startedAt,
        stripe_full_synced_at: startedAt,
        stripe_connected_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  } catch (error) {
    console.error("Import Stripe :", error instanceof Error ? error.message : error);
    await service.from("projects").update({ stripe_sync_status: "error" }).eq("id", projectId);
  }
}

export type StripeChanges = ReturnType<typeof changesOf>;

/**
 * Relit chez Stripe les objets changés (état actuel, jamais le seul message) et les enregistre.
 * Un client changé (sa carte, par exemple) entraîne la relecture de ses abonnements.
 */
export async function refreshStripeObjects(
  config: StripeConfig,
  projectId: string,
  connected: string,
  changes: StripeChanges,
) {
  const service = createServiceClient();
  if (!service) return;
  const account = await readTarget(config, connected);
  const customerIds = new Set([...changes.customers, ...changes.subscriptionsOf]);
  const [customers, ownSubscriptions, subscriptions, invoices, reference] = await Promise.all([
    Promise.all(
      [...customerIds].map((id) =>
        getObject<StripeCustomer>(config, account, `/v1/customers/${id}`, {
          "expand[]": CUSTOMER_EXPAND,
        }),
      ),
    ),
    Promise.all(
      [...changes.subscriptionsOf].map((customer) =>
        listAll<StripeSubscription>(config, account, "/v1/subscriptions", {
          customer,
          status: "all",
          "expand[]": SUBSCRIPTION_EXPAND.map((path) => `data.${path}`),
        }),
      ),
    ),
    Promise.all(
      [...changes.subscriptions].map((id) =>
        getObject<StripeSubscription>(config, account, `/v1/subscriptions/${id}`, {
          "expand[]": SUBSCRIPTION_EXPAND,
        }),
      ),
    ),
    Promise.all(
      [...changes.invoices].map((id) =>
        getObject<StripeInvoice>(config, account, `/v1/invoices/${id}`),
      ),
    ),
    referenceData(config, account),
  ]);
  // Carte de secours d'un abonnement : celle de son client, relu si besoin.
  const known = new Set(customers.map((customer) => customer.id));
  const missing = [
    ...new Set(
      subscriptions
        .map((sub) => (typeof sub.customer === "string" ? sub.customer : sub.customer.id))
        .filter((id) => !known.has(id)),
    ),
  ];
  const extra = await Promise.all(
    missing.map((id) =>
      getObject<StripeCustomer>(config, account, `/v1/customers/${id}`, {
        "expand[]": CUSTOMER_EXPAND,
      }),
    ),
  );
  await saveAll(projectId, {
    customers: [...customers, ...extra],
    subscriptions: [...ownSubscriptions.flat(), ...subscriptions],
    invoices,
    reference,
  });
  // Clients effacés dans Stripe : effacés ici aussi.
  const deleted = [
    ...changes.deletedCustomers,
    ...[...customers, ...extra].filter((c) => c.deleted).map((c) => c.id),
  ];
  if (deleted.length) {
    await service.from("stripe_customers").delete().eq("project_id", projectId).in("id", deleted);
  }
}

type Project = {
  id: string;
  stripe_account_id: string;
  stripe_synced_at: string | null;
  stripe_full_synced_at: string | null;
};

/**
 * Suivi horaire d'un compte : seulement ce qui a changé depuis le dernier passage (journal des
 * événements Stripe), sinon un import complet (premier passage, chaque jour, ou trop de
 * changements). Une erreur pendant le suivi laisse les données en place ; le passage suivant
 * reprend du même point.
 */
export async function syncStripeProject(config: StripeConfig, project: Project) {
  const service = createServiceClient();
  if (!service) return;
  const lastFull = project.stripe_full_synced_at ? Date.parse(project.stripe_full_synced_at) : 0;
  if (!project.stripe_synced_at || Date.now() - lastFull > FULL_EVERY_MS) {
    return syncStripeAccount(config, project.id, project.stripe_account_id);
  }
  const startedAt = new Date().toISOString();
  try {
    const since = Math.floor(Date.parse(project.stripe_synced_at) / 1000) - OVERLAP_S;
    const events = await listAll<StripeEvent>(
      config,
      await readTarget(config, project.stripe_account_id),
      "/v1/events",
      { "created[gt]": String(since), "types[]": TRACKED_EVENTS },
      MAX_CHANGES + 1,
    );
    const changes = changesOf(events);
    if (events.length > MAX_CHANGES || changes.total > MAX_CHANGES) {
      return syncStripeAccount(config, project.id, project.stripe_account_id);
    }
    if (changes.total) {
      await refreshStripeObjects(config, project.id, project.stripe_account_id, changes);
    }
    await service
      .from("projects")
      .update({ stripe_synced_at: startedAt, stripe_sync_status: "done" })
      .eq("id", project.id);
  } catch (error) {
    console.error("Suivi Stripe :", error instanceof Error ? error.message : error);
  }
}

/**
 * Suivi de tous les comptes Stripe connectés, l'un après l'autre (lancé chaque heure par le
 * serveur : deploy/scripts/stripe-sync.sh).
 */
export async function syncAllStripeAccounts(config: StripeConfig) {
  const service = createServiceClient();
  if (!service) return 0;
  const { data: projects } = await service
    .from("projects")
    .select("id, stripe_account_id, stripe_synced_at, stripe_full_synced_at")
    .not("stripe_account_id", "is", null);
  for (const project of projects ?? []) {
    await syncStripeProject(config, { ...project, stripe_account_id: project.stripe_account_id! });
  }
  return projects?.length ?? 0;
}
