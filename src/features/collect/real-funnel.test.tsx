import { render, screen } from "@testing-library/react";
import { LazyMotion, domAnimation } from "motion/react";
import { describe, expect, it } from "vitest";
import type { RealFunnel } from "./funnel";
import { lossSentence, RealTunnel } from "./real-funnel";

const visit = { id: "visit", label: "Visiteurs", count: 120 } as const;
const signup = { id: "signup", label: "Inscription ouverte", count: 6 } as const;

const funnel = (visitors: number, opened: number, weakest: number): RealFunnel => ({
  visitors,
  steps: [
    { ...visit, count: visitors },
    { ...signup, count: opened },
  ],
  weakest,
  segments: { device: [], channel: [] },
  guesses: { pricing: null, signup: null },
});

const show = (value: RealFunnel) =>
  render(
    <LazyMotion features={domAnimation}>
      <RealTunnel funnel={value} />
    </LazyMotion>,
  );

// Les nombres français utilisent des espaces insécables : comparées comme des espaces simples.
const plain = (text: string) => text.replace(/\s/g, " ");

describe("lossSentence", () => {
  it("le chiffre d'abord, au singulier comme au pluriel", () => {
    expect(plain(lossSentence(visit, signup))).toBe(
      "Seulement 5,0 % passent de « Visiteurs » à « Inscription ouverte » : 114 visiteurs perdus sur la période.",
    );
    expect(lossSentence({ ...visit, count: 21 }, { ...signup, count: 20 })).toContain(
      ": 1 visiteur perdu sur la période.",
    );
  });

  it("personne n'est passé : pas de « 0,0 % seulement »", () => {
    expect(lossSentence({ ...visit, count: 25 }, { ...signup, count: 0 })).toBe(
      "Aucun des 25 visiteurs n'est passé de « Visiteurs » à « Inscription ouverte » sur la période.",
    );
  });
});

describe("RealTunnel", () => {
  it("2 visiteurs : trop tôt pour conclure, aucun conseil hâtif", () => {
    show(funnel(2, 0, -1));
    expect(screen.getByText("Encore trop tôt pour conclure.")).toBeInTheDocument();
    expect(screen.queryByText(/freinent/)).not.toBeInTheDocument();
    expect(screen.queryByText("Action recommandée")).not.toBeInTheDocument();
  });

  it("assez de visiteurs : l'étape à corriger, avec un conseil adapté à l'étape d'avant", () => {
    show(funnel(120, 6, 1));
    expect(screen.getByText("Peu de visiteurs vont jusqu'à l'inscription.")).toBeInTheDocument();
    expect(screen.queryByText(/freinent/)).not.toBeInTheDocument();
  });
});
