const CACHE = "touchgrass-v11";
// ponytail: these must match the ?v= query strings in index.html exactly —
// confirmed by hand that a mismatch here means offline mode silently serves
// nothing for that file until one successful online load backfills the cache
// under the real request URL. Bump both together when editing app.js/style.css.
const SHELL = ["./", "index.html", "style.css?v=10", "app.js?v=11", "dares.json", "manifest.json", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "assets/backdrop-day.jpg", "assets/backdrop-night.jpg"];

self.addEventListener("install", (e) => {
  // without skipWaiting, a new SW sits "waiting" until every open tab fully
  // closes — confirmed by hand: that left a stale cached index.html (old
  // asset ?v= urls) controlling the page straight through a reload.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      // cache same-origin shell responses and cross-origin model weights alike,
      // so a second visit (and the offline demo) actually works.
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
