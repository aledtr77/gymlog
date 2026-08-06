import './styles.css';
import { el } from './ui/el.js';
import { define, setNotFound, start, go, refresh } from './core/router.js';
import { on } from './core/bus.js';
import { init } from './core/state.js';
import { mountRestBar } from './features/timer.js';
import { mountNav } from './ui/nav.js';
import { applyTheme, watchSystemTheme } from './services/theme.js';
import { audio, screen as wakeScreen, net, notify } from './platform/index.js';
import { watch as watchSync, drain } from './services/sync.js';
import * as prefs from './services/prefs.js';

/* Routes are lazy: opening the dashboard never downloads the calculators. */
define('/', () => import('./features/dashboard.js'));
define('/session', () => import('./features/session.js'));
define('/session/:index', () => import('./features/session.js'));
define('/timer', () => import('./features/timer.js'));
define('/exercises', () => import('./features/exercises.js'));
define('/stats', () => import('./features/stats.js'));
define('/more', () => import('./features/more.js'));
setNotFound(() => import('./features/dashboard.js'));

async function boot() {
  const root = document.getElementById('app');

  applyTheme();
  watchSystemTheme();

  try {
    await init();
  } catch (error) {
    console.error('[gymlog] startup failed', error);
    root.replaceChildren(
      el(
        'div',
        { class: 'screen' },
        el('p', { class: 'text-center text-ink-3 mt-20' }, 'Non riesco ad avviare l’app. Ricarica la pagina.'),
      ),
    );
    return;
  }

  root.removeAttribute('aria-busy');
  mountNav(document.body);
  mountRestBar(document.body);
  wakeScreen.watch();
  watchSync();
  net.watch((online) => online && drain());

  // Audio needs a user gesture before it will ever play.
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  // Ask for notifications only after the first logged set, never on load.
  document.addEventListener('gymlog:first-set', () => notify.ask(), { once: true });

  await start(root);
  if (!location.hash) go('/', { replace: true });

  // Any state write redraws the current screen; nothing patches its own DOM.
  on('state', () => refresh());

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch((error) => console.warn('[gymlog] service worker not registered', error));
}

boot();
