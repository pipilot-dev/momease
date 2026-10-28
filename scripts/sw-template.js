// MomEase service worker — cache-first for hashed assets, network-first for HTML.
const CACHE = '__CACHE_VERSION__';
const CORE = ['/', '/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't proxy cross-origin

  // Hashed assets (JS/CSS in /_expo/static/... or /icons/): cache-first.
  // Only a *successful, non-HTML* response may be cached or served from cache. Cloudflare
  // Pages answers an unknown/not-yet-propagated path with the SPA's index.html and a 200;
  // caching that under a permanent hashed URL would break the app until storage is cleared.
  if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
    const isHtml = (r) => (r.headers.get('content-type') || '').includes('text/html');
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached && !isHtml(cached)) return cached;
        return fetch(req).then((res) => {
          if (res.ok && !isHtml(res)) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => (cached && !isHtml(cached) ? cached : Response.error()));
      })
    );
    return;
  }

  // HTML navigations: network-first, fall back to cached index for offline.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put('/', clone)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('/').then((r) => r || new Response('Offline', { status: 503 })))
    );
    return;
  }
});

// --- Web push (Phase 2 ready) --------------------------------------------
// When a real push arrives (once a VAPID-signed backend is wired), render it
// as a native OS notification. Payload contract: { title, body, url }.
self.addEventListener('push', (e) => {
  let payload = { title: 'MomEase', body: 'You have a new notification', url: '/' };
  try { if (e.data) payload = { ...payload, ...e.data.json() }; }
  catch { if (e.data) payload.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url },
    tag: payload.tag || 'momease-push',
  }));
});

// Clicking a notification focuses any open MomEase tab (or opens one) at
// the URL the payload requested.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      if (c.url.includes(self.location.origin)) { await c.focus(); c.navigate?.(target); return; }
    }
    await self.clients.openWindow(target);
  })());
});
