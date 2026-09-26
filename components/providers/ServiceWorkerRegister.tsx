"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the app can be installed and shows a friendly offline
 * screen on flaky hospital Wi-Fi.
 *
 * Production only: in development a service worker would serve stale code
 * between edits. Browsers also only allow service workers on HTTPS (or
 * localhost), so on a phone over plain http://192.168… this quietly does
 * nothing — that is expected.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
      console.warn("Service worker registration failed", error);
    });
  }, []);

  return null;
}
