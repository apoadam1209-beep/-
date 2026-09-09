/* صندوق الأسرار — service worker: offline-first app shell + fonts cache */
const VERSION = "sunduq-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const FONT_CACHE = `${VERSION}-fonts`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(["./", "./index.html", "./manifest.webmanifest"]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Google Fonts: stale-while-revalidate
  if (url.origin.includes("fonts.googleapis.com") || url.origin.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // same-origin: cache-first with network fallback (app shell & icons)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const copy = res.clone();
                caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
              }
              return res;
            })
            .catch(() => caches.match("./index.html"))
      )
    );
  }
});
