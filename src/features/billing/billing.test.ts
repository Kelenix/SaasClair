import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { profileUpdate, verifyStripeSignature } from "./apply";
import { accessOf, annualTotal, lookupKey, parseLookupKey, trialDaysLeft } from "./plans";

const now = new Date("2026-10-31T12:00:00Z");

describe("offres", () => {
  it("identifiants des prix Stripe, dans les deux sens", () => {
    expect(lookupKey("growth", "annual")).toBe("saasclair_growth_annual");
    expect(parseLookupKey("saasclair_starter_monthly")).toEqual({
      plan: "starter",
      interval: "monthly",
    });
    expect(parseLookupKey("autre_prix")).toBeNull();
  });

  it("annuel : −20 % sur 12 mois", () => {
    expect(annualTotal("starter")).toBe(278.4);
    expect(annualTotal("growth")).toBe(758.4);
  });
});

describe("accès au tableau de bord", () => {
  const profile = (status: string, trialEnd: string, role = "user") => ({
    role,
    subscription_status: status,
    trial_ends_at: trialEnd,
  });

  it("essai en cours, puis écran de choix d'offre à la fin de l'essai", () => {
    expect(accessOf(profile("trialing", "2026-11-05T00:00:00Z"), now)).toBe("trial");
    expect(accessOf(profile("trialing", "2026-10-30T00:00:00Z"), now)).toBe("expired");
    expect(trialDaysLeft("2026-11-05T00:00:00Z", now)).toBe(5);
  });

  it("abonné, retard de paiement, arrêt, suspension ; le super administrateur jamais bloqué", () => {
    expect(accessOf(profile("active", "2026-01-01T00:00:00Z"), now)).toBe("paid");
    expect(accessOf(profile("past_due", "2026-01-01T00:00:00Z"), now)).toBe("past_due");
    expect(accessOf(profile("canceled", "2026-01-01T00:00:00Z"), now)).toBe("expired");
    expect(accessOf(profile("suspended", "2026-12-01T00:00:00Z"), now)).toBe("suspended");
    expect(accessOf(profile("canceled", "2026-01-01T00:00:00Z", "super_admin"), now)).toBe("paid");
  });
});

describe("notifications de Stripe", () => {
  const secret = "whsec_test";
  const payload = '{"id":"evt_1"}';
  const sign = (t: number, body = payload) =>
    `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
  const t = Math.floor(now.getTime() / 1000);

  it("signature valide acceptée ; corps modifié, mauvais secret ou trop ancienne refusés", () => {
    expect(verifyStripeSignature(payload, sign(t), secret, now)).toBe(true);
    expect(verifyStripeSignature('{"id":"evt_2"}', sign(t), secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(t), "whsec_autre", now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(t - 600), secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
  });

  it("abonnement → profil : offre, rythme, statut, moyen de paiement, renouvellement", () => {
    const update = profileUpdate({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: true,
      default_payment_method: { type: "sepa_debit" },
      items: {
        data: [
          {
            current_period_end: 1_793_000_000,
            price: { lookup_key: "saasclair_growth_annual" },
          },
        ],
      },
    });
    expect(update).toEqual({
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_1",
      plan: "growth",
      billing_interval: "annual",
      subscription_status: "active",
      payment_method: "sepa",
      current_period_end: new Date(1_793_000_000_000).toISOString(),
      cancel_at_period_end: true,
    });
    expect(
      profileUpdate({ id: "sub_2", customer: "cus_1", status: "unpaid", items: { data: [] } }),
    ).toBeNull();
  });
});
