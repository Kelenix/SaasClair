"use client";

import { useId, useState, useTransition } from "react";
import { AnimatePresence, m } from "motion/react";
import { toast } from "sonner";
import { BellRing, Info, Mail, MessageSquare, Plug, Unplug } from "lucide-react";
import { Icon } from "@/components/brand/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardEyebrow } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { saveAlertPreferences, saveSlackWebhook } from "./actions";
import { ALERTS, slackWebhookSchema, type AlertId, type AlertSettings } from "./catalog";

const reveal = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.screen, ease: EASE_OUT },
} as const;

function SettingRow({
  icon,
  title,
  detail,
  children,
}: {
  icon?: React.ComponentProps<typeof Icon>["icon"];
  title: string;
  detail: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 border-t border-line py-4 first:border-0">
      <span className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-cream text-forest">
            <Icon icon={icon} anim="wiggle" className="size-4" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block font-semibold text-ink">{title}</span>
          <span className="block text-[13px] text-slate">{detail}</span>
        </span>
      </span>
      {children}
    </li>
  );
}

/** Branchement de Slack par webhook entrant : validation en direct, adresse jamais réaffichée. */
function SlackConnect({ onConnected }: { onConnected: () => void }) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const check = slackWebhookSchema.safeParse(url);
  const error = url && !check.success ? check.error.issues[0]?.message : undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!check.success) return;
    startTransition(async () => {
      const result = await saveSlackWebhook(url);
      if (!result.ok) return void toast.error(result.message);
      toast.success("Slack est connecté. Vos alertes y arriveront aussi.");
      onConnected();
    });
  };

  return (
    <m.form {...reveal} onSubmit={submit} className="mt-1 mb-4 rounded-2xl bg-cream p-4" noValidate>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-[13px] text-ink">
        <li>Dans Slack, ouvrez « Applications », puis « Webhooks entrants ».</li>
        <li>Choisissez le canal qui recevra les alertes.</li>
        <li>Copiez l&apos;adresse fournie et collez-la ici.</li>
      </ol>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        Adresse du webhook
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://hooks.slack.com/services/…"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <Button type="submit" disabled={!check.success || isPending}>
          <Icon icon={Plug} anim="pop" /> {isPending ? "Connexion…" : "Connecter"}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
    </m.form>
  );
}

/** Alertes actives par défaut ; chaque interrupteur s'enregistre aussitôt. */
export function AlertSettingsPanel({ initial, email }: { initial: AlertSettings; email: string }) {
  const [settings, setSettings] = useState(initial);
  const [isSlackFormOpen, setIsSlackFormOpen] = useState(false);
  const [, startTransition] = useTransition();

  const save = (next: AlertSettings, success?: string) => {
    const previous = settings;
    setSettings(next);
    startTransition(async () => {
      const result = await saveAlertPreferences({
        disabledAlerts: next.disabledAlerts,
        emailEnabled: next.emailEnabled,
      });
      if (!result.ok) {
        setSettings(previous);
        toast.error(result.message);
      } else if (success) toast.success(success);
    });
  };

  const toggleAlert = (alertId: AlertId, isOn: boolean) =>
    save({
      ...settings,
      disabledAlerts: isOn
        ? settings.disabledAlerts.filter((item) => item !== alertId)
        : [...settings.disabledAlerts, alertId],
    });

  const disconnectSlack = () =>
    startTransition(async () => {
      const result = await saveSlackWebhook(null);
      if (!result.ok) return void toast.error(result.message);
      setSettings((current) => ({ ...current, slackConnected: false }));
      toast.success("Slack est déconnecté.");
    });

  const activeCount = ALERTS.length - settings.disabledAlerts.length;
  const hasNoChannel = !settings.emailEnabled && !settings.slackConnected;

  return (
    <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[1.3fr_1fr]">
      <Card>
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <CardEyebrow>Alertes</CardEyebrow>
            <p className="font-serif text-xl font-semibold text-forest">
              {activeCount} alertes sur {ALERTS.length} sont actives.
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-tint text-emerald-ink">
            <Icon icon={BellRing} anim="wiggle" />
          </span>
        </div>
        <ul>
          {ALERTS.map((alert) => {
            const isOn = !settings.disabledAlerts.includes(alert.id);
            return (
              <SettingRow key={alert.id} title={alert.label} detail={alert.detail}>
                <Switch
                  checked={isOn}
                  onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                  aria-label={`Alerte « ${alert.label} »`}
                />
              </SettingRow>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardEyebrow>Canaux de réception</CardEyebrow>
        <p className="mb-2 font-serif text-xl font-semibold text-forest">Où vous prévenir.</p>
        <ul>
          <SettingRow icon={Mail} title="Email" detail={email}>
            <Switch
              checked={settings.emailEnabled}
              onCheckedChange={(checked) =>
                save(
                  { ...settings, emailEnabled: checked },
                  checked ? "Les alertes arriveront par email." : undefined,
                )
              }
              aria-label="Recevoir les alertes par email"
            />
          </SettingRow>
          <SettingRow
            icon={MessageSquare}
            title="Slack"
            detail={
              settings.slackConnected ? (
                <Badge tone="growth" className="mt-1">
                  Connecté
                </Badge>
              ) : (
                "Dans le canal de votre choix."
              )
            }
          >
            {settings.slackConnected ? (
              <Button variant="ghost" size="sm" onClick={disconnectSlack}>
                <Icon icon={Unplug} anim="wiggle" /> Retirer
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={isSlackFormOpen}
                onClick={() => setIsSlackFormOpen((open) => !open)}
              >
                {isSlackFormOpen ? "Annuler" : "Connecter"}
              </Button>
            )}
          </SettingRow>
        </ul>
        <AnimatePresence initial={false}>
          {isSlackFormOpen && !settings.slackConnected && (
            <SlackConnect
              onConnected={() => {
                setIsSlackFormOpen(false);
                setSettings((current) => ({ ...current, slackConnected: true }));
              }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {hasNoChannel && (
            <m.p
              {...reveal}
              role="status"
              className="mt-2 flex gap-2.5 rounded-xl border-l-4 border-gold bg-cream px-3.5 py-3 text-[14px] text-ink"
            >
              <Icon icon={Info} className="mt-0.5 size-4 shrink-0 text-gold-ink" />
              Aucun canal actif : vos alertes resteront visibles dans la cloche, en haut de
              l&apos;écran.
            </m.p>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
