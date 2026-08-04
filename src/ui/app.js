/**
 * Shell applicativa: router a schede, barra di navigazione, timer di
 * recupero persistente e barra "allenamento in corso".
 *
 * La navigazione usa l'hash: il tasto "indietro" del sistema cambia scheda
 * invece di chiudere l'app, che è quello che ci si aspetta da un'app
 * installata.
 */

import { h, replace } from './dom.js';
import { icon } from './icons.js';
import { mountRestBar } from './restBar.js';
import { homeView } from './views/home.js';
import { workoutView } from './views/workout.js';
import { historyView } from './views/history.js';
import { progressView } from './views/progress.js';
import { settingsView } from './views/settings.js';
import { persistActive, state, subscribe } from '../core/store.js';
import { clock } from '../core/format.js';
import { applyTheme, watchSystemTheme } from './theme.js';
import { unlockAudio, reacquireWakeLockOnVisible } from '../core/feedback.js';

const TABS = [
  { id: 'home', label: 'Allena', iconName: 'dumbbell' },
  { id: 'history', label: 'Storico', iconName: 'history' },
  { id: 'progress', label: 'Progressi', iconName: 'chart' },
  { id: 'settings', label: 'Strumenti', iconName: 'settings' },
];

const VIEWS = {
  home: homeView,
  workout: workoutView,
  history: historyView,
  progress: progressView,
  settings: settingsView,
};

export function mountApp(root) {
  let current = null;
  let currentTab = 'home';

  const screen = h('div', { class: 'grow' });
  const tabbar = buildTabbar();
  const resumeHost = h('div');

  replace(root, screen, resumeHost, tabbar);
  root.removeAttribute('aria-busy');

  mountRestBar(document.getElementById('layer-sheet').parentElement);

  applyTheme(state.settings.theme);
  watchSystemTheme(() => state.settings.theme);
  reacquireWakeLockOnVisible();

  // Il primo tocco sblocca l'audio: senza un gesto utente il browser non
  // lascia suonare il beep di fine recupero.
  document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

  const ctx = {
    navigate,
    refresh: () => render(currentTab, { force: true }),
    get tab() {
      return currentTab;
    },
  };

  window.addEventListener('hashchange', () => {
    const tab = hashTab();
    if (tab !== currentTab) render(tab);
  });

  subscribe((reason) => {
    if (reason === 'active') updateResumeBar();
  });

  // Salvare al passaggio in background è l'ultima occasione utile prima che
  // il sistema possa terminare la pagina.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistActive();
  });

  render(hashTab() || (state.active ? 'workout' : 'home'));

  function hashTab() {
    const raw = location.hash.replace('#/', '').replace('#', '');
    return VIEWS[raw] ? raw : null;
  }

  function navigate(tab) {
    if (!VIEWS[tab]) return;
    if (location.hash !== `#/${tab}`) {
      location.hash = `#/${tab}`;
      return; // hashchange farà il render
    }
    render(tab, { force: true });
  }

  function render(tab, { force = false } = {}) {
    if (!VIEWS[tab]) tab = 'home';

    // La scheda "Allena" mostra l'allenamento in corso, se ce n'è uno.
    if (tab === 'home' && state.active) tab = 'workout';
    if (tab === 'workout' && !state.active) tab = 'home';

    if (!force && tab === currentTab && current) return;

    current?.destroy?.();
    currentTab = tab;

    const view = VIEWS[tab](ctx);
    current = view;
    replace(screen, view.node);
    window.scrollTo({ top: 0 });

    updateTabbar();
    updateResumeBar();
  }

  function buildTabbar() {
    return h(
      'nav',
      { class: 'tabbar', 'aria-label': 'Navigazione principale' },
      h(
        'div',
        { class: 'tabbar__inner', role: 'tablist' },
        TABS.map((tab) =>
          h(
            'button',
            {
              type: 'button',
              class: 'tab',
              role: 'tab',
              'data-tab': tab.id,
              'aria-selected': 'false',
              onClick: () => navigate(tab.id),
            },
            icon(tab.iconName),
            h('span', null, tab.label),
          ),
        ),
      ),
    );
  }

  function updateTabbar() {
    const activeTab = currentTab === 'workout' ? 'home' : currentTab;
    tabbar.querySelectorAll('.tab').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.tab === activeTab));
    });
    // Durante l'allenamento la barra sparisce: lo spazio verticale serve
    // tutto alle serie, e uscire per sbaglio a metà sessione è fastidioso.
    tabbar.classList.toggle('hidden', currentTab === 'workout');
  }

  /** Barra fissa che riporta all'allenamento in corso da qualsiasi scheda. */
  function updateResumeBar() {
    const shouldShow = Boolean(state.active) && currentTab !== 'workout';

    if (!shouldShow) {
      replace(resumeHost);
      clearInterval(resumeHost._ticker);
      return;
    }

    if (resumeHost.firstChild) return;

    const timeEl = h('span', { class: 'resume__time' }, '00:00');
    const bar = h(
      'button',
      { type: 'button', class: 'resume', onClick: () => navigate('workout') },
      h(
        'span',
        { class: 'grow' },
        h('span', { class: 'resume__label' }, 'Allenamento in corso'),
        h('br'),
        h('span', null, state.active.name),
      ),
      timeEl,
      icon('chevron'),
    );

    replace(resumeHost, bar);

    const tick = () => {
      if (!state.active) return;
      timeEl.textContent = clock(Date.now() - new Date(state.active.startedAt).getTime());
    };
    tick();
    clearInterval(resumeHost._ticker);
    resumeHost._ticker = setInterval(tick, 1000);
  }
}
