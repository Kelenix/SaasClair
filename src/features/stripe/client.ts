import "server-only";

// Dialogue avec Stripe (sans SDK : quelques appels REST). La plateforme SaasClair lit le compte
// de son client grâce à l'en-tête Stripe-Account, après son autorisation (OAuth Stripe Connect) :
// aucune clé du client n'est jamais stockée, et SaasClair ne fait que lire. ADR-024, ADR-025.

/** read_only n'est accordé par Stripe qu'aux extensions (ADR-025) : read_write par défaut. */
export type StripeScope = "read_only" | "read_write";

export type StripeConfig = {
  secretKey: string;
  clientId: string;
  scope: StripeScope;
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
    scope: process.env.STRIPE_OAUTH_SCOPE === "read_only" ? "read_only" : "read_write",
    // Réglables pour les tests (Stripe simulé, /api/stripe-mock) ; jamais en production.
    apiBase: withoutTrailingSlash(process.env.STRIPE_API_BASE ?? "https://api.stripe.com"),
    connectBase: withoutTrailingSlash(
      process.env.STRIPE_CONNECT_BASE ?? "https://connect.stripe.com",
    ),
  };
}

/** Page d'autorisation Stripe, retour vers redirectUri avec `state`. */
export function authorizeUrl(config: StripeConfig, state: string, redirectUri: string) {
  const url = new URL(`${config.connectBase}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: config.scope,
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
    error?: string;
    error_description?: string;
  } | null;
  if (!response.ok || !data?.stripe_user_id) {
    // Raison donnée par Stripe (jamais de clé ni de code) : mode test / réel différent, etc.
    console.error(
      `Connexion Stripe refusée (HTTP ${response.status}) : ${data?.error ?? "?"} — ${data?.error_description ?? ""}`,
    );
    return null;
  }
  return { accountId: data.stripe_user_id, livemode: Boolean(data.livemode) };
}

/**
 * Coupe l'accès de SaasClair au compte Stripe d'un client (suppression du projet ou du compte).
 * Sans cela, l'autorisation resterait valable chez Stripe après la suppression (audit, A4).
 * Renvoie true si Stripe a confirmé (ou si l'accès était déjà coupé).
 */
export async function deauthorizeAccount(config: StripeConfig, accountId: string) {
  const response = await fetch(`${config.connectBase}/oauth/deauthorize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ client_id: config.clientId, stripe_user_id: accountId }),
  }).catch(() => null);
  if (response?.ok) return true;
  const body = (await response?.json().catch(() => null)) as { error?: string } | null;
  // Déjà déconnecté (par le client lui-même, depuis Stripe) : rien à couper.
  if (body?.error === "invalid_client") return true;
  console.error(
    `Déconnexion Stripe refusée (HTTP ${response?.status ?? "?"}) : ${body?.error ?? ""}`,
  );
  return false;
}

/**
 * Version de l'API Stripe figée : la forme des objets lus ne change pas le jour où Stripe en
 * publie une nouvelle (normalize.ts lit aussi les formes plus anciennes et plus récentes).
 */
export const STRIPE_VERSION = "2025-03-31.basil";

type Params = Record<string, string | string[]>;

const RETRIES = 4;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lecture sur le compte connecté. « Trop de requêtes » (429), erreur passagère de Stripe (5xx)
 * ou réseau coupé : nouvel essai après le délai demandé par Stripe, sinon 1, 2, 4 puis 8 s.
 */
export async function stripeGet(
  config: StripeConfig,
  account: string,
  path: string,
  params: Params = {},
  sleep: (ms: number) => Promise<unknown> = wait,
) {
  const url = new URL(`${config.apiBase}${path}`);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) search.append(key, item);
  }
  url.search = search.toString();
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Stripe-Account": account,
        "Stripe-Version": STRIPE_VERSION,
      },
    }).catch(() => null);
    const retryable = !response || response.status === 429 || response.status >= 500;
    if (retryable && attempt < RETRIES) {
      const asked = Number(response?.headers.get("retry-after"));
      await sleep(asked > 0 ? Math.min(asked, 30) * 1000 : 1000 * 2 ** attempt);
      continue;
    }
    if (!response) throw new Error(`Stripe ${path} : réseau injoignable`);
    if (!response.ok) {
      // Message de Stripe (jamais de clé) : paramètre refusé, droits insuffisants…
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(`Stripe ${path} : HTTP ${response.status} — ${body?.error?.message ?? ""}`);
    }
    return response.json() as Promise<unknown>;
  }
}

/** Lit un objet du compte connecté (client, abonnement, facture). */
export async function getObject<T>(
  config: StripeConfig,
  account: string,
  path: string,
  params: Params = {},
) {
  return (await stripeGet(config, account, path, params)) as T;
}

/** Lit toutes les pages d'une liste Stripe (100 par page) du compte connecté. */
export async function listAll<T extends { id: string }>(
  config: StripeConfig,
  account: string,
  path: string,
  params: Params = {},
  max = 20_000,
): Promise<T[]> {
  const items: T[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = (await stripeGet(config, account, path, {
      limit: "100",
      ...params,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })) as { data: T[]; has_more: boolean };
    items.push(...page.data);
    if (!page.has_more || page.data.length === 0 || items.length >= max) return items;
    startingAfter = page.data[page.data.length - 1].id;
  }
}
