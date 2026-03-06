// Naam Jap Counter — Service Worker
// Bump CACHE_NAME on every deploy to force full refresh
const CACHE_NAME = 'naamjap-v16';
const ASSETS = ['./', './index.html', './manifest.json'];

// ── Install: pre-cache all assets ─────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  // Skip waiting so new SW activates immediately
  self.skipWaiting();
});

// ── Activate: delete every old cache version ───────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)   // keep only current version
          .map(k => caches.delete(k))       // delete all old versions
      )
    ).then(() => self.clients.claim())      // take control of all tabs immediately
  );
});

// ── Fetch: Network-first for HTML, cache-first for everything else ─
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document'
              || url.pathname.endsWith('.html')
              || url.pathname === '/'
              || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first: always try to get fresh HTML from server
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          // Update cache with fresh response
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => {
          // Offline fallback: return cached HTML
          return caches.match('./index.html');
        })
    );
  } else {
    // Cache-first for fonts, icons, manifest (rarely change)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        });
      })
    );
  }
});
