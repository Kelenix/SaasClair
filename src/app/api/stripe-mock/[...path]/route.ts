import { NextResponse, type NextRequest } from "next/server";

// Stripe SIMULÉ, pour les tests de bout en bout uniquement (STRIPE_MOCK=true, sur le poste de
// développement et dans la CI). Absent de la production : sans la variable, tout renvoie 404.
// Il rejoue le circuit réel : autorisation acceptée, échange du code, listes paginées.

// Un compte simulé distinct par autorisation : un compte Stripe ne se relie qu'à un seul projet.
const ACCOUNT = /^acct_mock[0-9a-z]+$/;
const DAY = 24 * 60 * 60;
const now = () => Math.floor(Date.now() / 1000);

// Comme le vrai Stripe sans dépliage : le produit n'est qu'un identifiant (nom : /v1/products).
const price = (amount: number, interval: "month" | "year", product: string) => ({
  unit_amount: amount,
  recurring: { interval, interval_count: 1 },
  product,
});

function lists(path: string) {
  const t = now();
  switch (path) {
    case "v1/customers":
      return [
        {
          id: "cus_test1",
          name: "Client test Alpha",
          email: "alpha@test.example",
          created: t - 300 * DAY,
        },
        {
          id: "cus_test2",
          name: "Client test Beta",
          email: "beta@test.example",
          created: t - 120 * DAY,
        },
        {
          id: "cus_test3",
          name: "Client test Gamma",
          email: "gamma@test.example",
          created: t - 40 * DAY,
        },
      ];
    case "v1/subscriptions":
      return [
        {
          id: "sub_test1",
          customer: "cus_test1",
          status: "active",
          created: t - 300 * DAY,
          items: {
            data: [
              {
                quantity: 1,
                current_period_end: t + 12 * DAY,
                price: price(7900, "month", "prod_pro"),
              },
            ],
          },
        },
        {
          id: "sub_test2",
          customer: "cus_test2",
          status: "past_due",
          created: t - 120 * DAY,
          cancel_at_period_end: true,
          items: {
            data: [
              {
                quantity: 1,
                current_period_end: t + 5 * DAY,
                price: price(75840, "year", "prod_pro_annuel"),
              },
            ],
          },
        },
        {
          id: "sub_test3",
          customer: "cus_test3",
          status: "canceled",
          created: t - 40 * DAY,
          canceled_at: t - 3 * DAY,
          ended_at: t - 3 * DAY,
          items: { data: [{ quantity: 1, price: price(2900, "month", "prod_starter") }] },
        },
      ];
    case "v1/invoices":
      return [
        {
          id: "in_test1",
          customer: "cus_test1",
          subscription: "sub_test1",
          status: "paid",
          amount_due: 7900,
          amount_paid: 7900,
          attempt_count: 1,
          created: t - 18 * DAY,
        },
        {
          id: "in_test2",
          customer: "cus_test2",
          subscription: "sub_test2",
          status: "open",
          amount_due: 75840,
          amount_paid: 0,
          attempt_count: 2,
          created: t - 2 * DAY,
          next_payment_attempt: t + 2 * DAY,
        },
      ];
    case "v1/products":
      return [
        { id: "prod_pro", name: "Pro" },
        { id: "prod_pro_annuel", name: "Pro annuel" },
        { id: "prod_starter", name: "Starter" },
      ];
    default:
      return null;
  }
}

const enabled = () => process.env.STRIPE_MOCK === "true";
const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });
const authorized = (request: NextRequest) =>
  request.headers.get("authorization") === `Bearer ${process.env.STRIPE_SECRET_KEY}`;

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Context) {
  if (!enabled()) return notFound();
  const path = (await params).path.join("/");

  // Le client « accepte » aussitôt : retour vers SaasClair avec un code et le jeton reçu.
  if (path === "oauth/authorize") {
    const query = request.nextUrl.searchParams;
    const back = new URL(query.get("redirect_uri")!);
    back.searchParams.set(
      "code",
      `ac_mock${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    );
    back.searchParams.set("state", query.get("state") ?? "");
    return NextResponse.redirect(back);
  }

  const data = lists(path);
  if (!data) return notFound();
  // Règle du vrai Stripe : 4 niveaux de dépliage au plus (sinon HTTP 400).
  const tooDeep = request.nextUrl.searchParams
    .getAll("expand[]")
    .some((expand) => expand.split(".").length > 4);
  if (tooDeep) {
    return NextResponse.json(
      { error: { message: "You cannot expand more than 4 levels of a property." } },
      { status: 400 },
    );
  }
  if (!authorized(request) || !ACCOUNT.test(request.headers.get("stripe-account") ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ object: "list", data, has_more: false });
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!enabled()) return notFound();
  if ((await params).path.join("/") !== "oauth/token" || !authorized(request)) return notFound();
  const body = new URLSearchParams(await request.text());
  const code = body.get("code") ?? "";
  if (!/^ac_mock[0-9a-z]+$/.test(code)) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }
  return NextResponse.json({
    stripe_user_id: `acct_mock${code.slice("ac_mock".length)}`,
    livemode: false,
    scope: "read_only",
  });
}
