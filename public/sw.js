/*
 * OraMedha - Resident — service worker.
 *
 * Deliberately minimal. It makes the app installable and replaces the
 * browser's dinosaur page with a friendly "you're offline" screen when a page
 * cannot load on weak hospital Wi-Fi.
 *
 * It does NOT cache pages, API responses or files. Everything in this app is
 * patient health data; keeping copies of it in a phone's cache is a privacy
 * decision to make on purpose later, not a side effect of installing a PWA.
 * Only the offline screen and the icons are cached.
 */
const CACHE = "oramedha-lite-shell-v1";
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
