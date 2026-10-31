"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SETTINGS_TABS, type SettingsTab } from "./tabs";

/** Onglets des paramètres ; l'onglet ouvert est gardé dans l'adresse (?onglet=…). */
export function SettingsTabs({
  initial,
  panels,
}: {
  initial: SettingsTab;
  panels: Record<SettingsTab, React.ReactNode>;
}) {
  const [tab, setTab] = useState<string>(initial);
  const select = (next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("onglet", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <Tabs value={tab} onValueChange={select} className="gap-6">
      <TabsList aria-label="Paramètres" className="self-start">
        {SETTINGS_TABS.map((item) => (
          <TabsTrigger key={item.id} value={item.id}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {SETTINGS_TABS.map((item) => (
        <TabsContent key={item.id} value={item.id}>
          {panels[item.id]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
