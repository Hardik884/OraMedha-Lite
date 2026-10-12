"use client";

import { useEffect } from "react";
import { keepInstallPrompt } from "@/lib/push/browser";

/**
 * Registers /sw.js so the app can be installed, shows a friendly offline
 * screen on flaky hospital Wi-Fi, and receives wrap-up reminders.
 *
 * Production only: in development a service worker would serve stale code
 * between edits. Browsers also only allow service workers on HTTPS (or
 * localhost), so on a phone over plain http://192.168… this quietly does
 * nothing — that is expected.
 *
 * Also keeps Android Chrome's "Install app" offer for the Add to home screen
 * guide (it fires once, early, on any page).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", keepInstallPrompt);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
        console.warn("Service worker registration failed", error);
      });
    }
    return () => window.removeEventListener("beforeinstallprompt", keepInstallPrompt);
  }, []);

  return null;
}
