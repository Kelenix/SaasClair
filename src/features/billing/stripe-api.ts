import "server-only";
import { stripeConfig } from "@/features/stripe/client";
import type { BillingSubscription } from "./apply";

// Facturation de SaasClair sur son propre compte Stripe (la plateforme) : quelques appels REST,
// sans SDK. Les adresses sont réglables pour le Stripe simulé des tests (STRIPE_API_BASE).

type Params = {
  [key: string]: string | number | boolean | Params | Params[] | string[] | undefined;
};

/** Encodage des formulaires Stripe : objets et listes en « a[b][0][c]=… ». */
function encode(params: Params, prefix = "", out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        typeof item === "object"
          ? encode(item, `${name}[${index}]`, out)
          : out.append(`${name}[${index}]`, String(item)),
      );
    } else if (typeof value === "object") {
      encode(value, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

async function stripe<T>(method: "GET" | "POST", path: string, params: Params = {}): Promise<T> {
  const config = stripeConfig();
  if (!config) throw new Error("Stripe n'est pas configuré.");
  const body = encode(params);
  const url = `${config.apiBase}${path}${method === "GET" && body.size ? `?${body}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
  });
  const data = (await response.json().catch(() => null)) as
    (T & { error?: { message?: string } }) | null;
  if (!response.ok || !data) {
    throw new Error(`Stripe ${path} : HTTP ${response.status} — ${data?.error?.message ?? ""}`);
  }
  return data;
}

export async function findPriceId(lookupKey: string) {
  const prices = await stripe<{ data: { id: string }[] }>("GET", "/v1/prices", {
    lookup_keys: [lookupKey],
    active: true,
  });
  return prices.data[0]?.id ?? null;
}

export async function createCustomer(input: { email: string; name: string; userId: string }) {
  const customer = await stripe<{ id: string }>("POST", "/v1/customers", {
    email: input.email,
    name: input.name || undefined,
    preferred_locales: ["fr"],
    metadata: { user_id: input.userId },
  });
  return customer.id;
}

/**
 * Page de paiement Stripe : TVA calculée par Stripe Tax, numéro de TVA intracommunautaire,
 * moyens de paiement activés dans le tableau de bord Stripe (carte, SEPA, PayPal).
 */
export async function createCheckoutSession(input: {
  customer: string;
  price: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const automaticTax = process.env.BILLING_AUTOMATIC_TAX !== "false";
  const session = await stripe<{ url: string }>("POST", "/v1/checkout/sessions", {
    mode: "subscription",
    customer: input.customer,
    client_reference_id: input.userId,
    line_items: [{ price: input.price, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    locale: "fr",
    allow_promotion_codes: true,
    billing_address_collection: "required",
    automatic_tax: { enabled: automaticTax },
    tax_id_collection: { enabled: automaticTax },
    customer_update: { address: "auto", name: "auto" },
    subscription_data: { metadata: { user_id: input.userId } },
  });
  return session.url;
}

/** Portail client Stripe : changer d'offre ou de carte, factures, résiliation. */
export async function createPortalSession(input: { customer: string; returnUrl: string }) {
  const session = await stripe<{ url: string }>("POST", "/v1/billing_portal/sessions", {
    customer: input.customer,
    return_url: input.returnUrl,
    locale: "fr",
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION || undefined,
  });
  return session.url;
}

export function retrieveSubscription(id: string) {
  return stripe<BillingSubscription & { metadata?: Record<string, string> }>(
    "GET",
    `/v1/subscriptions/${encodeURIComponent(id)}`,
    { expand: ["default_payment_method"] },
  );
}
