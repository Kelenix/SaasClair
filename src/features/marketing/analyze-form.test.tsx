import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzeForm } from "./analyze-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("AnalyzeForm", () => {
  beforeEach(() => push.mockReset());

  it("explique l'erreur sans quitter la page si l'adresse est incomplète", async () => {
    render(<AnalyzeForm />);
    await userEvent.type(screen.getByLabelText("Adresse de votre SaaS"), "monsaas{Enter}");
    expect(screen.getByText(/par exemple monsaas\.fr/)).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse de votre SaaS")).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("emmène vers l'inscription avec l'adresse normalisée", async () => {
    render(<AnalyzeForm />);
    await userEvent.type(screen.getByLabelText("Adresse de votre SaaS"), "www.monsaas.fr/prix");
    await userEvent.click(screen.getByRole("button", { name: /Analyser mon SaaS/ }));
    expect(push).toHaveBeenCalledWith("/inscription?site=https%3A%2F%2Fwww.monsaas.fr");
  });
});
