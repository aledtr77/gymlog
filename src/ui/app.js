/**
 * The app: today's plan, the session, and the log.
 *
 * Navigation is one variable. There is no router and no menu, because from
 * any screen there is exactly one place to go.
 */

import { h, replace } from './dom.js';
import { state, subscribe, init } from '../core/store.js';
import { firstUnfinished, todaySession } from '../core/plan.js';
import { unlockAudio } from '../core/feedback.js';
import { todayScreen } from './today.js';
import { sessionScreen } from './session.js';
import { historyScreen } from './history.js';
import { mountRestBar } from './restbar.js';

export async function mountApp(root) {
  await init();

  let screen = { name: 'today' };
  const host = h('div');

  replace(root, host);
  root.removeAttribute('aria-busy');
  mountRestBar(document.body);

  // The first touch unlocks audio, or the end-of-rest beep never sounds.
  document.addEventListener('pointerdown', () => unlockAudio(), { once: true });

  const go = (next) => {
    screen = next;
    window.scrollTo({ top: 0 });
    render();
  };

  const ctx = {
    toToday: () => go({ name: 'today' }),
    toSession: (cursor) => go({ name: 'session', cursor: typeof cursor === 'number' ? cursor : null }),
    toHistory: () => go({ name: 'history' }),
  };

  subscribe(render);
  render();

  function render() {
    // Every screen pins an action except the log, so the rest bar has to
    // ride above it there and sit low here.
    document.body.classList.toggle('has-action', screen.name !== 'history');

    if (screen.name === 'session') {
      // Resolve which exercise we are on once, on entry. Recomputing it every
      // render would jump you to the next lift the instant you finish your
      // last set — the screen changing under your hands as the rest starts.
      if (screen.cursor === null) screen.cursor = firstUnfinished(todaySession(state.entries));
      replace(host, sessionScreen(ctx, screen.cursor));
    }
    else if (screen.name === 'history') replace(host, historyScreen(ctx));
    else replace(host, todayScreen(ctx));
  }
}
