import { render, screen } from "@testing-library/react";
import { LazyMotion, domAnimation } from "motion/react";
import { Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { NoData } from "./no-data";

const props = {
  title: "Revenus",
  icon: Wallet,
  needs: "stripe" as const,
  description: "Connectez Stripe.",
  waiting: "Stripe est connecté.",
};
const show = (node: React.ReactNode) =>
  render(<LazyMotion features={domAnimation}>{node}</LazyMotion>);

describe("NoData", () => {
  it("étape à faire : le bouton, puis un dessin étiqueté de l'écran, sans aucun chiffre", () => {
    const { container } = show(<NoData {...props} remaining={["stripe"]} preview="revenue" />);
    expect(screen.getByText("Une étape, et cet écran se remplit.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Connecter Stripe/ })).toHaveAttribute(
      "href",
      "/configuration?etape=stripe",
    );
    expect(screen.getByText("À quoi ressemblera cet écran")).toBeInTheDocument();
    expect(container.querySelector("figure")?.textContent).not.toMatch(/\d/);
  });

  it("« rien à signaler » n'est pas un vide : pas de dessin quand on le demande", () => {
    show(<NoData {...props} remaining={[]} preview="insights" previewWhenWaiting={false} />);
    expect(screen.getByText("Vos premières données arrivent.")).toBeInTheDocument();
    expect(screen.queryByText("À quoi ressemblera cet écran")).toBeNull();
  });
});
