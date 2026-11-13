import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { STRIPE_VERSION, stripeGet } = await import("./client");

const config = {
  secretKey: "sk_test_x",
  clientId: "ca_x",
  scope: "read_write" as const,
  apiBase: "https://api.stripe.test",
  connectBase: "https://connect.stripe.test",
};
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

afterEach(() => vi.unstubAllGlobals());

describe("stripeGet", () => {
  it("version figée, compte connecté, paramètres répétés (expand[])", async () => {
    const fetch = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal("fetch", fetch);
    await stripeGet(config, "acct_1", "/v1/subscriptions", { "expand[]": ["a", "b"] });
    const [url, init] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://api.stripe.test/v1/subscriptions?expand%5B%5D=a&expand%5B%5D=b",
    );
    expect(init.headers).toMatchObject({
      "Stripe-Account": "acct_1",
      "Stripe-Version": STRIPE_VERSION,
    });
  });

  it("« trop de requêtes » : attend le délai demandé, puis réessaie", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(429, {}, { "Retry-After": "2" }))
      .mockResolvedValueOnce(json(500, {}))
      .mockResolvedValueOnce(json(200, { data: [] }));
    vi.stubGlobal("fetch", fetch);
    const waits: number[] = [];
    const sleep = async (ms: number) => void waits.push(ms);
    await expect(stripeGet(config, "acct_1", "/v1/customers", {}, sleep)).resolves.toEqual({
      data: [],
    });
    expect(waits).toEqual([2000, 2000]);
  });

  it("refus définitif (droits, paramètre) : erreur claire, sans nouvel essai", async () => {
    const fetch = vi.fn(async () => json(403, { error: { message: "Accès refusé" } }));
    vi.stubGlobal("fetch", fetch);
    await expect(stripeGet(config, "acct_1", "/v1/customers", {}, async () => {})).rejects.toThrow(
      "HTTP 403 — Accès refusé",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
