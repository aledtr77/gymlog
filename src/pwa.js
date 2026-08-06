/**
 * Registrazione del service worker e aggiornamenti.
 *
 * Quando esce una nuova versione l'app non si ricarica da sola: farlo a metà
 * allenamento significherebbe far ripartire il timer e perdere il focus su un
 * campo. Si avvisa e si lascia decidere.
 */

import { toast } from './ui/toast.js';
import { state } from './core/store.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env?.DEV) return;

  // L'avvio attende IndexedDB, quindi quando si arriva qui l'evento "load"
  // è già passato: agganciarcisi e basta significherebbe non registrare mai
  // il service worker, e quindi niente funzionamento offline.
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
 * Prompt di installazione.
 * Chrome emette beforeinstallprompt una volta sola: va conservato e
 * riproposto in un momento sensato, non appena la pagina si apre.
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

/** Suggerisce l'installazione dopo il terzo allenamento, non prima. */
export function maybeSuggestInstall() {
  if (!canInstall()) return;
  if (state.workouts.length < 3) return;

  toast('Aggiungi GymLog alla schermata home', {
    duration: 8000,
    iconName: 'download',
    action: { label: 'Installa', onClick: () => promptInstall() },
  });
}
