/**
 * MathTutor Service Worker
 * - Precaches app shell on install
 * - Network-first strategy for navigation and API routes
 * - Cache-first for static assets (JS, CSS, images, fonts)
 * - Never caches /api/* responses
 * - Shows offline fallback page when network is unavailable
 */

const CACHE_NAME = 'mathtutor-v1';
const OFFLINE_URL = '/offline.html';

// App shell resources to precache on install
const APP_SHELL = [
  '/',
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Precache failed for some resources:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept non-GET requests
  if (request.method !== 'GET') return;

  // 2. Never cache /api/* — always go straight to network
  if (url.pathname.startsWith('/api/')) return;

  // 3. Skip cross-origin requests (CDN fonts, MathJax, etc.)
  if (url.origin !== self.location.origin) return;

  // 4. Static assets: Cache-first
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 5. Navigation requests: Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (cached) =>
            cached ||
            new Response('<h1>You are offline</h1>', {
              headers: { 'Content-Type': 'text/html' },
            })
        )
      )
    );
    return;
  }

  // 6. Everything else: Network-first, cache the response
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

