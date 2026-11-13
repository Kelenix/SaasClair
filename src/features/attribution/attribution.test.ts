import { describe, expect, it } from "vitest";
import { classifyChannel } from "./attribution";

const from = (referrer: string) => classifyChannel({ referrer });

describe("classifyChannel : le site d'où vient la visite", () => {
  it("assistants IA, même chez Google ou Microsoft", () => {
    expect(from("https://chatgpt.com/")).toBe("ai");
    expect(from("https://www.perplexity.ai/search")).toBe("ai");
    expect(from("https://gemini.google.com/app")).toBe("ai");
    expect(from("https://copilot.microsoft.com/")).toBe("ai");
    expect(classifyChannel({ source: "chatgpt.com" })).toBe("ai");
  });

  it("messageries web : un email, pas de la recherche", () => {
    expect(from("https://mail.google.com/mail/u/0/")).toBe("email");
    expect(from("https://outlook.live.com/mail/")).toBe("email");
    expect(from("https://webmail.orange.fr/")).toBe("email");
  });

  it("réseaux sociaux : X, YouTube, Reddit… et Meta à part", () => {
    expect(from("https://t.co/abc")).toBe("social");
    expect(from("https://x.com/nadia")).toBe("social");
    expect(from("https://www.youtube.com/watch?v=1")).toBe("social");
    expect(from("https://old.reddit.com/r/saas")).toBe("social");
    expect(from("https://l.facebook.com/l.php")).toBe("instagram");
    expect(from("https://www.instagram.com/")).toBe("instagram");
  });

  it("moteurs de recherche de tous les pays", () => {
    expect(from("https://www.google.fr/")).toBe("seo");
    expect(from("https://www.google.co.uk/")).toBe("seo");
    expect(from("https://duckduckgo.com/")).toBe("seo");
  });

  it("un nom de domaine qui ressemble ne trompe pas", () => {
    expect(from("https://dropbox.com/s/x")).toBe("referral");
    expect(from("https://notyoutube.com/")).toBe("referral");
  });

  it("identifiants de clic publicitaire sans UTM", () => {
    expect(classifyChannel({ clickIds: ["gclid"] })).toBe("ads");
    expect(classifyChannel({ clickIds: ["fbclid"] })).toBe("instagram");
    expect(classifyChannel({ clickIds: ["li_fat_id"] })).toBe("linkedin");
  });
});
