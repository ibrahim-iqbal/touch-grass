const CACHE = "touchgrass-v2";
// ponytail: these must match the ?v= query strings in index.html exactly —
// confirmed by hand that a mismatch here means offline mode silently serves
// nothing for that file until one successful online load backfills the cache
// under the real request URL. Bump both together when editing app.js/style.css.
const SHELL = ["./", "index.html", "style.css?v=2", "app.js?v=6", "dares.json", "manifest.json", "icon.svg", "icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
