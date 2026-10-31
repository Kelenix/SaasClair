import "server-only";

// Dialogue avec Stripe (sans SDK : quelques appels REST). La plateforme SaasClair lit le compte
// de son client grâce à l'en-tête Stripe-Account, après l'autorisation en lecture seule (OAuth
// Stripe Connect) : aucune clé du client n'est jamais stockée. ADR-024.

export type StripeConfig = {
  secretKey: string;
  clientId: string;
  apiBase: string;
  connectBase: string;
};

const withoutTrailingSlash = (url: string) => (url.endsWith("/") ? url.slice(0, -1) : url);

/** Null tant que STRIPE_SECRET_KEY et STRIPE_CONNECT_CLIENT_ID ne sont pas renseignés. */
export function stripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!secretKey || !clientId) return null;
  return {
    secretKey,
    clientId,
    // Réglables pour les tests (Stripe simulé, /api/stripe-mock) ; jamais en production.
    apiBase: withoutTrailingSlash(process.env.STRIPE_API_BASE ?? "https://api.stripe.com"),
    connectBase: withoutTrailingSlash(
      process.env.STRIPE_CONNECT_BASE ?? "https://connect.stripe.com",
    ),
  };
}

/** Page d'autorisation Stripe : lecture seule, retour vers redirectUri avec `state`. */
export function authorizeUrl(config: StripeConfig, state: string, redirectUri: string) {
  const url = new URL(`${config.connectBase}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: "read_only",
    state,
    redirect_uri: redirectUri,
  }).toString();
  return url.toString();
}

/** Échange le code de retour contre l'identifiant du compte Stripe du client. */
export async function exchangeCode(config: StripeConfig, code: string) {
  const response = await fetch(`${config.connectBase}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });
  const data = (await response.json().catch(() => null)) as {
    stripe_user_id?: string;
    livemode?: boolean;
  } | null;
  if (!response.ok || !data?.stripe_user_id) return null;
  return { accountId: data.stripe_user_id, livemode: Boolean(data.livemode) };
}

/** Lit toutes les pages d'une liste Stripe (100 par page) du compte connecté. */
export async function listAll<T extends { id: string }>(
  config: StripeConfig,
  account: string,
  path: string,
  params: Record<string, string> = {},
  max = 20_000,
): Promise<T[]> {
  const items: T[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const url = new URL(`${config.apiBase}${path}`);
    url.search = new URLSearchParams({
      limit: "100",
      ...params,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.secretKey}`, "Stripe-Account": account },
    });
    if (!response.ok) throw new Error(`Stripe ${path} : HTTP ${response.status}`);
    const page = (await response.json()) as { data: T[]; has_more: boolean };
    items.push(...page.data);
    if (!page.has_more || page.data.length === 0 || items.length >= max) return items;
    startingAfter = page.data[page.data.length - 1].id;
  }
}
