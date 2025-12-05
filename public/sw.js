const CACHE_NAME = "couple-questions-cache-v1";

self.addEventListener("install", (event) => {
  // Hier könntest du Dateien vorkachen, wir halten es minimal.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Standard: alles einfach durchreichen, kein aggressives Caching
  event.respondWith(fetch(event.request).catch(() => new Response("Offline")));
});
