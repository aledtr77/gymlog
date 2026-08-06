/**
 * Service worker.
 *
 * Two strategies, because navigations and assets want opposite things:
 * - navigations are network-first with the cached shell as fallback, so a
 *   new version lands as soon as there is signal and the app still opens in
 *   a gym basement where there is none;
 * - build assets are cache-first, since Vite puts a content hash in every
 *   filename and a cached one can never be stale.
 *
 * Background Sync drains the outbox when connectivity returns, which is why
 * the sync seam records intents rather than firing requests directly.
 */

const VERSION = 'v5';
const SHELL = `gymlog-shell-${VERSION}`;
const ASSETS = `gymlog-assets-${VERSION}`;

// Older prefixes must be swept too, or their caches sit on disk forever.
const PREFIXES = ['gymlog-', 'forgia-'];

const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      // addAll fails as a unit if one file is missing; here each asset is
      // independent and one absentee must not block installation.
      Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => PREFIXES.some((p) => k.startsWith(p)) && !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigateFirst(request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request));
  }
});

async function navigateFirst(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(SHELL);
    cache.put('/index.html', fresh.clone());
    return fresh;
  } catch {
    return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);

  if (hit) {
    // Refresh in the background without making anyone wait.
    fetch(request)
      .then((res) => res.ok && cache.put(request, res.clone()))
      .catch(() => {});
    return hit;
  }

  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'gymlog-sync') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => clients.forEach((c) => c.postMessage({ type: 'SYNC' }))),
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
