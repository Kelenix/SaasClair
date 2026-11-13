import { describe, expect, it } from "vitest";
import { checkInstall } from "./install-check";

const page = (head: string) => `<html><head>${head}</head><body></body></html>`;

describe("checkInstall", () => {
  it("trouve la ligne avec la bonne clé", () => {
    const html = page(
      `<script async src="https://saasclair.com/s.js" data-site="4e8ad624"></script>`,
    );
    expect(checkInstall(html, "4e8ad624")).toEqual({ status: "ok", foundKey: "4e8ad624" });
  });

  it("accepte l'ordre inverse des attributs et les guillemets simples", () => {
    const html = page(
      `<script data-site='4E8AD624' defer src='https://saasclair.com/s.js'></script>`,
    );
    expect(checkInstall(html, "4e8ad624").status).toBe("ok");
  });

  it("signale une autre clé (ligne copiée depuis un autre compte)", () => {
    const html = page(
      `<script async src="https://saasclair.com/s.js" data-site="aaaaaaaa"></script>`,
    );
    expect(checkInstall(html, "4e8ad624")).toEqual({ status: "wrong_key", foundKey: "aaaaaaaa" });
  });

  it("ligne absente, ou site injoignable", () => {
    expect(checkInstall(page(`<script src="/app.js"></script>`), "4e8ad624").status).toBe(
      "missing",
    );
    expect(
      checkInstall(page(`<script src="https://cdn.x.com/s.js"></script>`), "4e8ad624").status,
    ).toBe("missing");
    expect(checkInstall(null, "4e8ad624").status).toBe("unreachable");
  });
});
