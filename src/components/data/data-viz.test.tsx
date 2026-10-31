import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "./animated-number";
import { RiskMeter } from "./risk-meter";
import { toPoints } from "./sparkline";

describe("AnimatedNumber", () => {
  it("donne la valeur finale aux lecteurs d'écran, même pendant l'animation", () => {
    render(<AnimatedNumber value={25000} format="euro" />);
    expect(screen.getByText(/25\s000\s€/)).toHaveClass("sr-only");
  });
});

describe("RiskMeter", () => {
  it("expose le score comme une jauge accessible", () => {
    render(<RiskMeter score={82} />);
    const meter = screen.getByRole("meter", { name: "Risque de départ : 82 sur 100" });
    expect(meter).toHaveAttribute("aria-valuenow", "82");
  });
});

describe("toPoints", () => {
  it("place le minimum en bas et le maximum en haut", () => {
    const points = toPoints([10, 20, 15], 100, 40);
    expect(points).toEqual([
      [0, 40],
      [50, 0],
      [100, 20],
    ]);
  });

  it("reste à plat quand toutes les valeurs sont égales", () => {
    expect(toPoints([5, 5], 10, 10).map(([, y]) => y)).toEqual([10, 10]);
  });
});
