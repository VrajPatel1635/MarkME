// A safer SW for SPAs: avoid serving a stale index.html after deploy.
// If index.html is cached with old hashed asset references, mobile can show a blank screen.

const CACHE_VERSION = "markme-cache-v2";
const RUNTIME_CACHE = `markme-runtime-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  // Activate updated service worker ASAP.
  self.skipWaiting();

  // Precache minimal shell; rely on network-first for HTML.
  event.waitUntil(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.addAll([
        "/manifest.json",
      ])
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("markme-") && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations (HTML) to avoid stale app shell.
  const isHtmlNavigation = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isHtmlNavigation) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          // Fallback to root for SPA (best-effort)
          const fallback = await caches.match("/");
          return fallback || Response.error();
        }
      })()
    );
    return;
  }

  // Cache-first for static assets (js/css/images) for speed.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      const response = await fetch(req);
      const isCacheable = response && response.ok && (req.destination === "script" || req.destination === "style" || req.destination === "image" || req.destination === "font");
      if (isCacheable) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, response.clone());
      }
      return response;
    })()
  );
});
