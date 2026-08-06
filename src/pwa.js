/**
 * Service worker registration and updates.
 *
 * When a new version ships the app does not reload itself: doing that
 * mid-workout would restart the timer and blow away focus on a field.
 * It notifies instead, and lets the user decide.
 */

import { toast } from './ui/toast.js';
import { state } from './core/store.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env?.DEV) return;

  // Startup awaits IndexedDB, so by the time we get here the "load" event
  // has already fired: merely subscribing to it would mean never
  // registering the service worker, and therefore no offline support.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });

  async function register() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state !== 'installed' || !navigator.serviceWorker.controller) return;

          toast('È disponibile una nuova versione', {
            duration: 10000,
            iconName: 'info',
            action: {
              label: 'Aggiorna',
              onClick: () => {
                installing.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              },
            },
          });
        });
      });
    } catch (error) {
      console.warn('[gymlog] service worker non registrato', error);
    }
  }
}

/**
 * Install prompt.
 * Chrome fires beforeinstallprompt only once: it has to be stashed and
 * re-offered at a sensible moment, not the instant the page opens.
 */
let deferredPrompt = null;

export function watchInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

export function canInstall() {
  return Boolean(deferredPrompt);
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

/** Suggests installing after the third workout, not before. */
export function maybeSuggestInstall() {
  if (!canInstall()) return;
  if (state.workouts.length < 3) return;

  toast('Aggiungi GymLog alla schermata home', {
    duration: 8000,
    iconName: 'download',
    action: { label: 'Installa', onClick: () => promptInstall() },
  });
}
