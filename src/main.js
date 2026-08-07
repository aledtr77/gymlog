import './styles.css';
import { el } from './ui/el.js';
import { toast } from './ui/components.js';
import { define, setNotFound, start, refresh } from './core/router.js';
import { on } from './core/bus.js';
import { init } from './core/state.js';
import { mountTimerBar } from './services/timer.js';
import { mountNav } from './ui/nav.js';
import { applyTheme, watchSystemTheme } from './services/theme.js';
import { audio, screen as wakeScreen, net, notify } from './platform/index.js';
import { watch as watchSync, drain } from './services/sync.js';
import { storageStatus } from './services/db.js';

/* Routes are lazy: opening the dashboard never downloads the calculators. */
define('/', () => import('./features/dashboard.js'));
define('/training', () => import('./features/training.js'));
define('/session', () => import('./features/session.js'));
define('/session/:index', () => import('./features/session.js'));
define('/timer', () => import('./features/timer.js'));
define('/exercises', () => import('./features/exercises.js'));
define('/stats', () => import('./features/stats.js'));
define('/more', () => import('./features/more.js'));
define('/settings', () => import('./features/settings.js'));
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
        el('p', { class: 'text-center text-ink-3 mt-20' }, 'GymLog could not start. Reload the page and try again.'),
      ),
    );
    return;
  }

  root.removeAttribute('aria-busy');
  mountNav(document.body);
  mountTimerBar(document.body);
  wakeScreen.watch();
  watchSync();
  net.watch((online) => online && drain());

  // Audio needs a user gesture before it will ever play.
  document.addEventListener('pointerdown', () => audio.unlock(), { once: true });
  // Ask for notifications only after the first logged set, never on load.
  document.addEventListener('gymlog:first-set', () => notify.ask(), { once: true });

  if (!location.hash) location.replace('#/training');
  await start(root);

  if (storageStatus().mode === 'memory') {
    toast('Storage is temporary: new data will be lost when GymLog closes. Export a backup before leaving.', {
      variant: 'err',
      duration: 10000,
    });
  }

  // Any state write redraws the current screen; nothing patches its own DOM.
  on('state', () => refresh());
  on('storage:error', (error) => {
    console.error('[gymlog] storage write failed', error);
    toast('Could not save this change. Your previous data is still safe; export a backup and reload GymLog.', {
      variant: 'err',
      duration: 10000,
    });
  });

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch((error) => console.warn('[gymlog] service worker not registered', error));
}

boot();
