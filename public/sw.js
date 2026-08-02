// Service Worker for Aimless PWA.
// A walking app must work with no signal - precache the shell, fall back to
// cache for everything else. No CDN, no external resources (roadmap A2).

const CACHE = 'aimless-v0.1.0-50860e96';

// Resolved against the worker's own URL, so the app works at a domain root
// or under a subpath (GitHub Pages project sites) with no changes.
const ROOT = new URL('./', self.location).pathname;

const PRECACHE = [
  './',
  './index.html',
  './sim.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './lib/geo.js',
  './lib/rng.js',
  './lib/walk.js',
  './lib/deck.js',
  './lib/store.js',
  './lib/proximity.js',
  './lib/export.js',
  './data/crow.json',
  './data/threshold.json',
  './data/lattice.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // addAll fails the whole install if any request fails; use individual
      // adds so a missing icon does not block the shell.
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => console.warn('[sw] precache miss:', url, err.message))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // HTML and JSON: network-first so updates land, cache fallback offline.
  if (url.pathname.endsWith('.html') || url.pathname === ROOT || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Everything else (icons, JS modules, data): cache-first.
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
