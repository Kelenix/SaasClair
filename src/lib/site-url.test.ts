import { describe, expect, it } from "vitest";
import { displaySiteUrl, normalizeSiteUrl } from "./site-url";

describe("normalizeSiteUrl", () => {
  it.each([
    ["monsaas.fr", "https://monsaas.fr"],
    ["  www.monsaas.fr  ", "https://www.monsaas.fr"],
    ["https://app.monsaas.io/tarifs?x=1", "https://app.monsaas.io"],
    ["http://monsaas.com", "http://monsaas.com"],
    ["MonSaas.FR", "https://monsaas.fr"],
  ])("accepte « %s »", (input, expected) => {
    expect(normalizeSiteUrl(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "monsaas",
    "localhost:3000",
    "192.168.1.10",
    "ftp://monsaas.fr",
    "mon saas.fr",
  ])("refuse « %s »", (input) => {
    expect(normalizeSiteUrl(input)).toBeNull();
  });
});

describe("displaySiteUrl", () => {
  it("retire le protocole", () => {
    expect(displaySiteUrl("https://monsaas.fr")).toBe("monsaas.fr");
  });
});
