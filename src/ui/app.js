/**
 * The whole app: two screens.
 *
 *   list      — your exercises, each showing what you lifted last time
 *   exercise  — the one screen where you record a set
 *
 * Navigation is a single variable. There is no router, no tab bar and no
 * menu, because there is nowhere else to go.
 */

import { h, replace } from './dom.js';
import { subscribe, init } from '../core/store.js';
import { unlockAudio } from '../core/feedback.js';
import { listScreen } from './list.js';
import { exerciseScreen } from './exercise.js';
import { historyScreen } from './history.js';
import { mountRestBar } from './restbar.js';

export async function mountApp(root) {
  await init();

  let screen = { name: 'list' };
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
    toList: () => go({ name: 'list' }),
    toExercise: (exercise) => go({ name: 'exercise', exercise }),
    toHistory: () => go({ name: 'history' }),
  };

  subscribe(render);
  render();

  function render() {
    if (screen.name === 'exercise') replace(host, exerciseScreen(screen.exercise, ctx));
    else if (screen.name === 'history') replace(host, historyScreen(ctx));
    else replace(host, listScreen(ctx));
  }
}
