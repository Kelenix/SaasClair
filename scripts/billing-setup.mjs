// Installe la facturation de SaasClair dans son compte Stripe (une fois ; relançable sans risque).
// Crée ce qui manque : produits Starter et Growth, 4 prix HT (TVA à part, Stripe Tax), point de
// réception des notifications, configuration du portail client. ADR-027.
//
// Lancé sur le serveur par deploy/scripts/billing-setup.sh, qui reporte dans le .env les valeurs
// imprimées « CLÉ=valeur ». Aucune dépendance : appels REST de Stripe.

const key = process.env.STRIPE_SECRET_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
if (!key || !site) {
  console.error("✗ STRIPE_SECRET_KEY ou NEXT_PUBLIC_SITE_URL manquant.");
  process.exit(1);
}
const api = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

function encode(params, prefix = "", out = new URLSearchParams()) {
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const field = prefix ? `${prefix}[${name}]` : name;
    if (Array.isArray(value)) {
      value.forEach((item, index) =>
        typeof item === "object"
          ? encode(item, `${field}[${index}]`, out)
          : out.append(`${field}[${index}]`, String(item)),
      );
    } else if (typeof value === "object") encode(value, field, out);
    else out.append(field, String(value));
  }
  return out;
}

async function stripe(method, path, params = {}) {
  const body = encode(params);
  const response = await fetch(`${api}${path}${method === "GET" && body.size ? `?${body}` : ""}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path} : ${data?.error?.message ?? response.status}`);
  return data;
}

const PLANS = [
  { id: "starter", name: "SaasClair Starter", monthly: 2900 },
  { id: "growth", name: "SaasClair Growth", monthly: 7900 },
];
const INTERVALS = [
  { id: "monthly", interval: "month", amount: (monthly) => monthly },
  { id: "annual", interval: "year", amount: (monthly) => Math.round(monthly * 12 * 0.8) },
];

console.log(
  `• Compte Stripe en mode ${key.startsWith("sk_live") || key.startsWith("rk_live") ? "RÉEL" : "test"}.`,
);

// 1. Produits et prix (retrouvés par leur lookup_key : rien n'est créé deux fois).
const productIds = {};
const priceIds = {};
for (const plan of PLANS) {
  for (const period of INTERVALS) {
    const lookup = `saasclair_${plan.id}_${period.id}`;
    const found = await stripe("GET", "/v1/prices", {
      lookup_keys: [lookup],
      expand: ["data.product"],
    });
    if (found.data[0]) {
      priceIds[lookup] = found.data[0].id;
      productIds[plan.id] = found.data[0].product.id;
      console.log(`• Prix ${lookup} déjà présent.`);
      continue;
    }
    if (!productIds[plan.id]) {
      const product = await stripe("POST", "/v1/products", {
        name: plan.name,
        tax_code: "txcd_10103001", // Logiciel en ligne (SaaS), usage professionnel
        metadata: { saasclair_plan: plan.id },
      });
      productIds[plan.id] = product.id;
      console.log(`• Produit ${plan.name} créé.`);
    }
    const price = await stripe("POST", "/v1/prices", {
      product: productIds[plan.id],
      currency: "eur",
      unit_amount: period.amount(plan.monthly),
      recurring: { interval: period.interval },
      tax_behavior: "exclusive", // prix HT : la TVA s'ajoute selon le pays du client
      lookup_key: lookup,
      nickname: `${plan.name} — ${period.id === "annual" ? "annuel" : "mensuel"}`,
    });
    priceIds[lookup] = price.id;
    console.log(`• Prix ${lookup} créé (${period.amount(plan.monthly) / 100} € HT).`);
  }
}

// 2. Point de réception des notifications (son secret n'est donné qu'à la création).
const webhookUrl = `${site}/api/billing/webhook`;
const endpoints = await stripe("GET", "/v1/webhook_endpoints", { limit: 100 });
if (endpoints.data.some((endpoint) => endpoint.url === webhookUrl)) {
  console.log("• Point de réception des notifications déjà présent.");
} else {
  const endpoint = await stripe("POST", "/v1/webhook_endpoints", {
    url: webhookUrl,
    description: "SaasClair — abonnements",
    enabled_events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed",
    ],
  });
  console.log("• Point de réception des notifications créé.");
  console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
}

// 3. Portail client : changer d'offre ou de carte, factures, résiliation en fin de période.
if (process.env.STRIPE_PORTAL_CONFIGURATION) {
  console.log("• Configuration du portail client déjà présente.");
} else {
  const portal = await stripe("POST", "/v1/billing_portal/configurations", {
    business_profile: { headline: "SaasClair — votre abonnement" },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id", "name"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: PLANS.map((plan) => ({
          product: productIds[plan.id],
          prices: INTERVALS.map((period) => priceIds[`saasclair_${plan.id}_${period.id}`]),
        })),
      },
    },
  });
  console.log("• Configuration du portail client créée.");
  console.log(`STRIPE_PORTAL_CONFIGURATION=${portal.id}`);
}
console.log("✓ Facturation installée dans Stripe.");
