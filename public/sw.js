/*
 * OraMedha - Resident — service worker.
 *
 * Deliberately minimal. It makes the app installable and replaces the
 * browser's dinosaur page with a friendly "you're offline" screen when a page
 * cannot load on weak hospital Wi-Fi.
 *
 * It also shows the evening wrap-up reminder (push) and opens Wrap up the day
 * when it's tapped.
 *
 * It does NOT cache pages, API responses or files. Everything in this app is
 * patient health data; keeping copies of it in a phone's cache is a privacy
 * decision to make on purpose later, not a side effect of installing a PWA.
 * Only the offline screen and the icons are cached.
 */
const CACHE = "oramedha-lite-shell-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/brand/oramedha-mark.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ── Notifications (the evening wrap-up reminder) ─────────────────────────────
// The payload carries counts only, never patient names (see lib/push/reminder).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = typeof data.title === "string" ? data.title : "OraMedha - Resident";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === "string" ? data.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof data.tag === "string" ? data.tag : "oramedha",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/today" },
    }),
  );
});

// Tapping it opens the right screen, reusing an open window if there is one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/today", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          return w.focus().then(() => ("navigate" in w ? w.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only page navigations get the offline fallback. Everything else goes
  // straight to the network, untouched.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached || Response.error()),
    ),
  );
});
