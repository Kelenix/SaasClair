"use client";

import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, classifyChannel } from "./channels";

/**
 * Note la provenance du visiteur à son premier passage (paramètres UTM et site d'origine).
 * Un seul cookie interne au site, jamais réécrit : c'est le premier contact qui compte.
 */
export function AttributionTracker() {
  useEffect(() => {
    if (document.cookie.split("; ").some((item) => item.startsWith(`${ATTRIBUTION_COOKIE}=`))) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const read = (key: string) => params.get(key)?.slice(0, 150) || undefined;
    const referrer =
      document.referrer && new URL(document.referrer).origin !== window.location.origin
        ? document.referrer.slice(0, 200)
        : undefined;
    const source = read("utm_source") ?? (params.has("gclid") ? "google" : undefined);
    const medium = read("utm_medium") ?? (params.has("gclid") ? "cpc" : undefined);
    const value = {
      channel: classifyChannel({ source, medium, referrer, clickIds: [...params.keys()] }),
      source,
      medium,
      campaign: read("utm_campaign"),
      referrer,
      landing: window.location.pathname.slice(0, 200),
    };
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${ATTRIBUTION_MAX_AGE}; samesite=lax`;
  }, []);
  return null;
}
