/**
 * Service worker.
 *
 * Due strategie distinte:
 * - navigazioni: network-first con fallback all'app shell in cache, così una
 *   nuova versione arriva subito quando c'è rete e l'app si apre comunque
 *   quando non ce n'è (che in palestra è la norma);
 * - risorse statiche: cache-first con aggiornamento in background. I file
 *   generati dalla build hanno un hash nel nome, quindi la cache non può
 *   servire una versione stantia.
 */

const VERSION = 'v3';
const SHELL_CACHE = `forgia-shell-${VERSION}`;
const ASSET_CACHE = `forgia-assets-${VERSION}`;

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
      // addAll fallisce in blocco se manca un solo file: qui ogni risorsa è
      // indipendente e una mancante non deve impedire l'installazione.
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
          .filter((key) => key.startsWith('forgia-') && !key.endsWith(VERSION))
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
    // Rinfresca in background senza far attendere l'utente.
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
