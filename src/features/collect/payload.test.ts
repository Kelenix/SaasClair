import { describe, expect, it } from "vitest";
import { deviceOf, isSameSite, parsePayload, toEvent, type Payload } from "./payload";

const base: Payload = {
  s: "4e8ad624",
  t: "pageview",
  u: "https://monsaas.fr/tarifs?utm_source=linkedin&utm_campaign=lancement&email=nadia@x.fr",
  r: "https://www.linkedin.com/feed/",
  v: "v_8f3k2m9q1x",
  w: 1440,
};

describe("parsePayload", () => {
  it("accepte un message valide et refuse le reste", () => {
    expect(parsePayload(JSON.stringify(base))?.s).toBe("4e8ad624");
    expect(parsePayload("pas du json")).toBeNull();
    expect(parsePayload(JSON.stringify({ ...base, s: "KEY" }))).toBeNull();
    expect(parsePayload(JSON.stringify({ ...base, v: "a b" }))).toBeNull();
    expect(parsePayload("x".repeat(5000))).toBeNull();
  });
});

describe("toEvent", () => {
  it("garde le chemin sans ses paramètres, classe le canal et l'appareil", () => {
    expect(toEvent(base, "https://monsaas.fr")).toEqual({
      type: "pageview",
      visitor_id: "v_8f3k2m9q1x",
      path: "/tarifs",
      referrer_host: "linkedin.com",
      channel: "linkedin",
      utm_source: "linkedin",
      utm_medium: null,
      utm_campaign: "lancement",
      device: "desktop",
      email_hash: null,
    });
  });

  it("refuse une page d'un autre site que celui du projet", () => {
    expect(toEvent({ ...base, u: "https://autre-site.com/" }, "https://monsaas.fr")).toBeNull();
    expect(
      toEvent({ ...base, u: "https://app.monsaas.fr/" }, "https://www.monsaas.fr"),
    ).not.toBeNull();
    expect(toEvent({ ...base, u: "javascript:alert(1)" }, null)).toBeNull();
  });

  it("une navigation interne n'est pas une provenance", () => {
    const event = toEvent({ ...base, u: "https://monsaas.fr/a", r: "https://monsaas.fr/" }, null);
    expect(event?.referrer_host).toBeNull();
    expect(event?.channel).toBe("direct");
  });

  it("l'identification exige l'empreinte de l'email", () => {
    expect(toEvent({ ...base, t: "identify" }, null)).toBeNull();
    const hash = "a".repeat(64);
    expect(toEvent({ ...base, t: "identify", e: hash }, null)?.email_hash).toBe(hash);
  });
});

describe("outils", () => {
  it("reconnaît le même site, avec ou sans www", () => {
    expect(isSameSite("www.monsaas.fr", "monsaas.fr")).toBe(true);
    expect(isSameSite("monsaas.fr.evil.com", "monsaas.fr")).toBe(false);
  });

  it("déduit l'appareil de la largeur d'écran", () => {
    expect([deviceOf(390), deviceOf(800), deviceOf(1440), deviceOf(undefined)]).toEqual([
      "mobile",
      "tablet",
      "desktop",
      null,
    ]);
  });
});
