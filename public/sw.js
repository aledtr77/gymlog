/**
 * Service worker.
 *
 * Two distinct strategies:
 * - navigations: network-first with a fallback to the cached app shell, so a
 *   new version lands immediately when there is a connection and the app
 *   still opens when there is not (the norm in a gym basement);
 * - static assets: cache-first with a background refresh. Build output
 *   carries a hash in the filename, so the cache cannot serve a stale one.
 */

const VERSION = 'v4';
const SHELL_CACHE = `gymlog-shell-${VERSION}`;
const ASSET_CACHE = `gymlog-assets-${VERSION}`;

// `forgia-` is the old prefix: it has to be swept up too, or the previous
// version's caches would sit on disk forever.
const CACHE_PREFIXES = ['gymlog-', 'forgia-'];

const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll fails as a unit if a single file is missing: here each asset
      // stands alone, and one absentee must not block installation.
      Promise.allSettled(SHELL.map((url) => cache.add(url))),
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
          .filter(
            (key) =>
              CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
              !key.endsWith(VERSION),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleAsset(request));
});

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('/index.html', response.clone());
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match('/index.html')) ||
      (await cache.match('/')) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

async function handleAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // Refresh in the background without making the user wait.
    fetch(request)
      .then((response) => {
        if (response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch (error) {
    const shell = await caches.open(SHELL_CACHE);
    const fallback = await shell.match(request);
    if (fallback) return fallback;
    throw error;
  }
}
