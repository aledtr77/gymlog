/**
 * Service worker registration.
 *
 * A new version is picked up on the next open rather than announced with a
 * banner. Interrupting someone mid-set to offer an update is the kind of
 * thing that makes an app feel like work.
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  // Startup awaits IndexedDB, so "load" has already fired by the time we get
  // here: waiting for it would mean never registering, and no offline mode.
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
    console.warn('[gymlog] service worker not registered', error);
  });
}
