// Service Worker for Aimless PWA.
// A walking app must work with no signal - precache the shell, fall back to
// cache for everything else. No CDN, no external resources (roadmap A2).

const CACHE = 'aimless-v0.2.0-1f420d15';

// Resolved against the worker's own URL, so the app works at a domain root
// or under a subpath (GitHub Pages project sites) with no changes.
const ROOT = new URL('./', self.location).pathname;

const PRECACHE = [
  './',
  './index.html',
  './sim.html',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/favicon-16.png',
  './icons/favicon-32.png',
  './icons/favicon-48.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-master.png',
  './lib/geo.js',
  './lib/rng.js',
  './lib/walk.js',
  './lib/deck.js',
  './lib/store.js',
  './lib/dexie.mjs',
  './lib/proximity.js',
  './lib/export.js',
  './lib/kml.js',
  './lib/skins.js',
  './lib/platform.js',
  './lib/inner.js',
  './lib/filters.js',
  './lib/filter-renderer.js',
  './lib/walk-nav.js',
  './lib/oracle.js',
  './lib/surprise.js',
  './lib/publish.js',
  './lib/engine/version.js',
  './lib/engine/spec.js',
  './lib/engine/registry.js',
  './lib/engine/rng.js',
  './lib/engine/color.js',
  './lib/engine/buffer.js',
  './lib/engine/render.js',
  './lib/engine/canvas.js',
  './lib/engine/incremental.js',
  './lib/engine/effects/pointwise.js',
  './lib/engine/effects/tone.js',
  './lib/engine/effects/blur.js',
  './lib/engine/effects/overlay.js',
  './lib/engine/effects/grain.js',
  './lib/engine/effects/glitch.js',
  './lib/engine/effects/bloom.js',
  './lib/engine/effects/dropshadow.js',
  './lib/engine/effects/compound.js',
  './lib/engine/effects/liquid.js',
  './lib/engine/effects/specular.js',
  './lib/engine/effects/morphology.js',
  './lib/engine/effects/outline.js',
  './lib/engine/effects/echo.js',
  './lib/engine/pool.js',
  './lib/engine/parity.html',
  './lib/engine/gl/context.js',
  './lib/engine/gl/index.js',
  './lib/engine/gl/infra.js',
  './lib/engine/gl/programs.js',
  './lib/engine/gl/textures.js',
  './lib/engine/gl/readback.js',
  './lib/engine/gl/uniforms.js',
  './lib/engine/gl/blends.js',
  './lib/engine/gl/fusion.js',
  './lib/engine/gl/renderer.js',
  './lib/engine/gl/support.js',
  './lib/engine/gl/effects/blur.js',
  './lib/engine/gl/effects/overlay.js',
  './lib/engine/gl/effects/procedural.js',
  './lib/engine/gl/effects/composite.js',
  './data/crow.json',
  './data/threshold.json',
  './data/lattice.json',
  './data/inner.json',
  './data/stray.json',
  './data/small.json',
  './data/slow.json',
  './data/echo.json',
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
  event.waitUntil((async () => {
    // Old caches are never read (cacheFirst only looks in CACHE), so they
    // go unconditionally. Anything the install missed is fetched from the
    // network on first use and cached then; log it so a persistent miss is
    // visible in devtools.
    const cache = await caches.open(CACHE);
    const missing = [];
    for (const u of PRECACHE) {
      if (!(await cache.match(new URL(u, self.location).href))) missing.push(u);
    }
    if (missing.length > 0) console.warn('[sw] precache incomplete:', missing);
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // App-shell consistency: everything — navigations, JS modules, JSON —
  // serves from this worker's cache version. Network-first HTML could feed a
  // new index.html old modules (import skew) the moment a deploy lands; the
  // whole point of the stamped cache + update toast is that a worker only
  // ever serves the file set it precached. Updates land on SW activation.
  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  // This worker's cache only. The global caches.match() searches every cache
  // on the origin, oldest first, so a surviving old cache would keep serving
  // the previous build after an update.
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    // Offline and uncached: navigations fall back to the shell so the app
    // still opens; anything else gets a clean 503.
    if (request.mode === 'navigate') {
      const fallback = await cache.match(ROOT)
        ?? await cache.match(new URL('index.html', self.location).href);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}
