"use client";

/**
 * Notifications on this phone (browser only): ask permission, subscribe to
 * the browser's push service, or unsubscribe. The subscription is saved on
 * the server by the caller.
 */
export type PushSupport = "unsupported" | "default" | "granted" | "denied";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  // Normally registered at start-up (production); registering again is harmless.
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export type SubscriptionKeys = { endpoint: string; p256dh: string; auth: string };

/** Asks permission (if needed) and subscribes. null if the PG said no. */
export async function subscribeThisPhone(publicKey: string): Promise<SubscriptionKeys | null> {
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return null;
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** This phone's current subscription endpoint, if any. */
export async function currentEndpoint(): Promise<string | null> {
  if (pushSupport() === "unsupported") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}

/** Unsubscribes this phone; returns the endpoint that was removed. */
export async function unsubscribeThisPhone(): Promise<string | null> {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

/** Opened from the home-screen icon (installed app). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Android Chrome offers its own "Install app" prompt once per visit. It
 * arrives early, so it is caught at start-up (ServiceWorkerRegister) and kept
 * here until the PG taps Install on the guide.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let installPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function keepInstallPrompt(event: Event) {
  event.preventDefault();
  installPrompt = event as InstallPromptEvent;
  listeners.forEach((l) => l());
}

export function canPromptInstall(): boolean {
  return installPrompt !== null;
}

export function onInstallPromptChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<boolean> {
  if (!installPrompt) return false;
  const event = installPrompt;
  installPrompt = null;
  listeners.forEach((l) => l());
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}
