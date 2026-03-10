const CACHE_NAME = 'mhk-pat-app-v7';
const APP_ROOT = '/mhk-pat-app';
const APP_SHELL = [
  `${APP_ROOT}/`,
  `${APP_ROOT}/index.html`,
  `${APP_ROOT}/manifest.json`,
  `${APP_ROOT}/icon-192.png`,
  `${APP_ROOT}/icon-512.png`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!url.pathname.startsWith(APP_ROOT)) return;

  // Always prefer network for page loads so index updates cleanly.
  if (req.mode === 'navigate' || url.pathname === `${APP_ROOT}/` || url.pathname === `${APP_ROOT}/index.html`) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(`${APP_ROOT}/index.html`, copy));
          return response;
        })
        .catch(() => caches.match(`${APP_ROOT}/index.html`))
    );
    return;
  }

  // Cache-first for static files, with network fallback and cache update.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      });
    })
  );
});
