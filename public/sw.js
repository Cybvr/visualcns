// VisualCNS service worker. Bump CACHE when the offline shell changes so old
// caches are cleared on the next activation.
const CACHE = "visualcns-v3"
const OFFLINE_URL = "/offline"
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/apple-icon.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  // Development chunk URLs are reused by HMR; caching them serves stale UI.
  if (["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname)) return
  const { request } = event
  if (request.method !== "GET") return

  // The front-desk visitor tablet: keep the last good copy so it still opens
  // when the internet drops. Stored without ?key= so one copy serves every visit.
  const url = new URL(request.url)
  if (request.mode === "navigate" && /^\/[^/]+\/sign-in\/?$/.test(url.pathname)) {
    const cacheKey = url.origin + url.pathname
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(cacheKey, copy))
          }
          return response
        })
        .catch(() => caches.match(cacheKey).then((cached) => cached || caches.match(OFFLINE_URL))),
    )
    return
  }

  // Page navigations: try the network, fall back to the cached offline page so
  // the app opens something instead of the browser error when offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Static same-origin assets: serve from cache first, then fill the cache.
  if (url.origin === self.location.origin && /\.(?:css|js|svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
  }
})
