import { describe, expect, it } from "vitest";
import {
  attributionMetadata,
  classifyChannel,
  parseAttribution,
} from "@/features/attribution/attribution";
import { monthlyRevenue, summarize, type AdminProfile } from "./metrics";
import { siteSettingsSchema } from "./settings-schema";

const NOW = new Date("2026-10-30T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const profile = (overrides: Partial<AdminProfile>): AdminProfile => ({
  id: crypto.randomUUID(),
  email: "client@exemple.example",
  first_name: "Client",
  role: "user",
  plan: "growth",
  billing_interval: "monthly",
  payment_method: "card",
  custom_monthly_price: null,
  subscription_status: "active",
  trial_ends_at: daysAgo(30),
  current_period_end: null,
  cancel_at_period_end: false,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  signup_channel: "seo",
  signup_source: null,
  signup_medium: null,
  signup_campaign: null,
  signup_referrer: null,
  signup_landing: null,
  last_sign_in_at: null,
  last_seen_at: null,
  admin_note: null,
  created_at: daysAgo(40),
  updated_at: daysAgo(1),
  ...overrides,
});

describe("provenance des inscrits", () => {
  it("reconnaît les canaux à partir des UTM et du site d'origine", () => {
    expect(classifyChannel({ source: "google", medium: "cpc" })).toBe("ads");
    expect(classifyChannel({ referrer: "https://www.google.fr/" })).toBe("seo");
    expect(classifyChannel({ referrer: "https://www.linkedin.com/feed" })).toBe("linkedin");
    expect(classifyChannel({ source: "newsletter", medium: "email" })).toBe("email");
    expect(classifyChannel({ source: "instagram" })).toBe("instagram");
    expect(classifyChannel({ referrer: "https://blog.example/outils" })).toBe("referral");
    expect(classifyChannel({})).toBe("direct");
  });

  it("ignore un cookie abîmé et borne les valeurs reçues", () => {
    expect(parseAttribution("pas-du-json")).toBeNull();
    expect(parseAttribution(undefined)).toBeNull();
    const parsed = parseAttribution(
      encodeURIComponent(JSON.stringify({ channel: "inconnu", campaign: "x".repeat(400) })),
    );
    expect(parsed?.channel).toBe("direct");
    expect(parsed?.campaign).toBeUndefined();
    expect(attributionMetadata(parsed)).toMatchObject({ signup_channel: "direct" });
  });
});

describe("revenu des abonnements", () => {
  it("ramène l'annuel au mois avec la remise et ignore les essais et résiliés", () => {
    expect(monthlyRevenue(profile({ plan: "growth" }))).toBe(19.99);
    expect(monthlyRevenue(profile({ plan: "growth", billing_interval: "annual" }))).toBe(15.99);
    expect(monthlyRevenue(profile({ plan: "pro" }))).toBe(29.9);
    expect(monthlyRevenue(profile({ plan: "pro", billing_interval: "annual" }))).toBe(23.92);
    expect(monthlyRevenue(profile({ plan: "trial", subscription_status: "trialing" }))).toBe(0);
    expect(monthlyRevenue(profile({ subscription_status: "canceled" }))).toBe(0);
    // Un paiement en retard compte encore : l'abonnement n'est pas résilié.
    expect(monthlyRevenue(profile({ subscription_status: "past_due" }))).toBe(19.99);
  });

  it("résume les clients sans compter le super administrateur", () => {
    const summary = summarize(
      [
        profile({ plan: "starter", signup_channel: "linkedin", last_seen_at: daysAgo(0.001) }),
        profile({ plan: "growth", payment_method: "sepa" }),
        profile({
          plan: "trial",
          subscription_status: "trialing",
          trial_ends_at: daysAgo(-2),
          created_at: daysAgo(12),
        }),
        profile({ role: "super_admin", plan: "pro" }),
      ],
      NOW,
    );
    expect(summary.total).toBe(3);
    expect(summary.paying).toBe(2);
    expect(summary.mrr).toBeCloseTo(9.99 + 19.99, 2);
    expect(summary.online).toBe(1);
    expect(summary.trialing).toBe(1);
    expect(summary.trialsEndingSoon).toHaveLength(1);
    expect(summary.newLast30).toBe(1);
    expect(summary.byChannel.map((row) => row.channel)).toEqual(["seo", "linkedin"]);
    expect(summary.signupsByWeek).toHaveLength(12);
    expect(summary.mrrByMonth.at(-1)?.mrr).toBe(summary.mrr);
  });
});

describe("identifiants publicitaires", () => {
  it("accepte les formats officiels et des champs vides", () => {
    const parsed = siteSettingsSchema.safeParse({
      googleAdsId: "AW-123456789",
      googleAdsConversionLabel: "AbC-12dEf",
      ga4Id: "G-ABC123XYZ",
      metaPixelId: "123456789012345",
      linkedinPartnerId: "",
      contactEmail: "",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.linkedinPartnerId).toBeNull();
  });

  it("refuse un identifiant mal formé ou un script collé à la place", () => {
    for (const googleAdsId of ["123456789", "AW-12", "<script>alert(1)</script>"]) {
      expect(siteSettingsSchema.safeParse({ googleAdsId }).success).toBe(false);
    }
  });
});
