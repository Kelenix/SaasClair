import { describe, expect, it } from "vitest";
import { isPrivateAddress } from "./network-guard";
import { analyzeHomepage, detectPages, extractLinks, speedOf } from "./site-analysis";

const HOMEPAGE = `<!doctype html><html lang="fr"><head>
<title>MonSaaS — Le planning RH simple</title>
<meta name="description" content="MonSaaS aide les PME à planifier leurs équipes en quelques minutes, sans tableur.">
<meta name="viewport" content="width=device-width">
<script src="https://js.stripe.com/v3"></script>
<link rel="stylesheet" href="/wp-content/themes/x/style.css">
</head><body>
<h1>Le planning RH simple</h1>
<a href="/tarifs">Nos <b>tarifs</b></a>
<a href="https://app.monsaas.fr/register">Essai gratuit</a>
<a href="/blog">Blog</a>
<a href="https://buy.stripe.com/abc">Acheter</a>
</body></html>`;

describe("analyse de la page d'accueil", () => {
  it("trouve inscription, tarifs et paiement", () => {
    const links = extractLinks(HOMEPAGE, "https://monsaas.fr/");
    expect(detectPages(links)).toEqual({
      signup: "https://app.monsaas.fr/register",
      pricing: "https://monsaas.fr/tarifs",
      checkout: "https://buy.stripe.com/abc",
    });
  });

  it("mesure le référencement et reconnaît les technologies", () => {
    const audit = analyzeHomepage(HOMEPAGE, "https://monsaas.fr/", {}, 420);
    expect(audit.speed).toBe("rapide");
    expect(audit.pageCount).toBe(2);
    expect(audit.seo.score).toBe(100);
    expect(audit.seo.title).toBe("MonSaaS — Le planning RH simple");
    expect(audit.technologies).toEqual(["WordPress", "Stripe"]);
  });

  it("signale ce qui manque sans planter sur une page vide", () => {
    const audit = analyzeHomepage(
      "<html><body>Bientôt</body></html>",
      "http://monsaas.fr/",
      {},
      2500,
    );
    expect(audit.speed).toBe("lent");
    expect(audit.pages).toEqual({ signup: null, pricing: null, checkout: null });
    expect(audit.seo.score).toBe(0);
  });

  it("classe la vitesse", () => {
    expect([speedOf(300), speedOf(1200), speedOf(4000)]).toEqual(["rapide", "correct", "lent"]);
  });
});

describe("protection contre les adresses internes", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.20.1.1",
    "192.168.1.10",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("refuse %s", (address) => expect(isPrivateAddress(address)).toBe(true));

  it.each(["93.184.216.34", "172.32.0.1", "2606:4700::1111"])("accepte %s", (address) =>
    expect(isPrivateAddress(address)).toBe(false),
  );
});
