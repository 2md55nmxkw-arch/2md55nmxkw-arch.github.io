// 2md.arch service worker: cache-first for the shell, network for anything unknown.
// The single-file build embeds everything, so the plain page is a handful of requests.
const CACHE = "2md-arch-v2";
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
  // Let the browser/CDN handle partial media responses and non-shell assets.
  // Cache.put rejects 206 responses; an HTML fallback is invalid for media.
  if (event.request.headers.has("range")) return;
  const shellUrls = SHELL.map((file) => new URL(file, self.registration.scope).href);
  if (event.request.mode !== "navigate" && !shellUrls.includes(url.href)) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Refresh in the background without blocking the response.
        event.waitUntil(fetch(event.request).then(async (response) => {
          if (response.status === 200) await (await caches.open(CACHE)).put(event.request, response);
        }).catch(() => {}));
        return cached;
      }
      return fetch(event.request).then((response) => {
        if (response.status === 200 && response.type === "basic") {
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
        }
        return response;
      }).catch(async (error) => {
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("index.html");
          if (fallback) return fallback;
        }
        throw error;
      });
    })
  );
});
