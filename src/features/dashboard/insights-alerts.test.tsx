import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Segmented } from "@/components/ui/segmented";
import { alertPreferencesSchema, ALERTS, slackWebhookSchema } from "./alerts/catalog";
import { INSIGHTS } from "./demo-data";
import { getInsightHistory, summarize } from "./insights/history";
import { SETTINGS_TABS } from "./settings/tabs";

describe("historique des insights", () => {
  it("additionne l'impact mesuré des recommandations appliquées", () => {
    const stats = summarize(getInsightHistory({}));
    expect(stats).toMatchObject({ total: 12, done: 6, ignored: 3, pending: 3, measuring: 0 });
    expect(stats.measured).toBe(1940);
  });

  it("reprend le choix de l'utilisateur pour les insights de la semaine", () => {
    const entries = getInsightHistory({ [INSIGHTS[0].id]: "done", [INSIGHTS[1].id]: "ignored" });
    const stats = summarize(entries);
    expect(stats).toMatchObject({ done: 7, ignored: 4, pending: 1, measuring: 1 });
    expect(entries.filter((entry) => entry.isCurrent)).toHaveLength(3);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });
});

describe("alertes", () => {
  it("n'accepte que des alertes connues", () => {
    expect(
      alertPreferencesSchema.safeParse({ disabledAlerts: ["weekly-digest"], emailEnabled: false })
        .success,
    ).toBe(true);
    expect(
      alertPreferencesSchema.safeParse({ disabledAlerts: ["inconnue"], emailEnabled: true })
        .success,
    ).toBe(false);
    expect(new Set(ALERTS.map((alert) => alert.id)).size).toBe(ALERTS.length);
  });

  it("n'accepte qu'un webhook entrant Slack", () => {
    expect(
      slackWebhookSchema.safeParse("https://hooks.slack.com/services/T000/B000/abcdefghij").success,
    ).toBe(true);
    for (const url of [
      "https://example.com/hook",
      "http://hooks.slack.com/services/T000/B000/abcdefghij",
      "https://hooks.slack.com.evil.fr/services/T000/B000/abcdefghij",
    ]) {
      expect(slackWebhookSchema.safeParse(url).success).toBe(false);
    }
  });
});

describe("paramètres", () => {
  it("a des onglets aux identifiants uniques", () => {
    expect(new Set(SETTINGS_TABS.map((tab) => tab.id)).size).toBe(SETTINGS_TABS.length);
  });
});

function SegmentedHarness() {
  const [value, setValue] = useState<"a" | "b">("a");
  return (
    <Segmented
      label="Choix"
      options={[
        { value: "a", label: "Premier" },
        { value: "b", label: "Second", count: 4 },
      ]}
      value={value}
      onChange={setValue}
      pillId="test"
    />
  );
}

describe("choix en pilules", () => {
  it("signale l'option choisie aux lecteurs d'écran", () => {
    render(<SegmentedHarness />);
    const second = screen.getByRole("button", { name: /Second/ });
    expect(second).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Premier" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
