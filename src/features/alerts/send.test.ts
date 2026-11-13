import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { renderEmail } = await import("./send");

describe("renderEmail", () => {
  it("échappe tout ce qui vient des données (nom de client) dans le HTML", () => {
    const email = renderEmail(
      {
        subject: "<b>Client</b> risque de partir",
        intro: "Vous avez encore le temps.",
        lines: ['<img src=x onerror="alert(1)"> : 420 € par mois'],
        href: "/app/churn",
      },
      "Nadia",
    );
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(email.text).toContain("Bonjour Nadia,");
    expect(email.text).toContain("/app/churn");
  });
});
