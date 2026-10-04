// 2md.arch service worker: cache-first for the shell, network for anything unknown.
// The single-file build embeds everything, so the plain page is a handful of requests.
const CACHE = "2md-arch-v1";
const SHELL = [
  "index.html",
  "style.css",
  "scripts.js",
  "site.webmanifest",
  "assets/favicon.svg",
  "assets/favicon.png",
  "assets/logo.svg",
  "assets/fonts/onest-latin-wght-normal.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Refresh in the background without blocking the response.
        event.waitUntil(fetch(event.request).then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response));
        }).catch(() => {}));
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
        }
        return response;
      }).catch(() => caches.match("index.html"));
    })
  );
});
