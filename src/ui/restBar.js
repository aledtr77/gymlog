/**
 * Rest bar.
 * Anchored to the bottom and non-modal: you can keep scrolling the session
 * and editing sets while it runs. A full-screen timer would block exactly
 * the actions people take during a rest.
 */

import { h } from './dom.js';
import { mmss } from '../core/format.js';
import { addRestTime, getRestState, onRestChange, stopRest } from '../core/restTimer.js';

let node = null;

export function mountRestBar(root) {
  const timeEl = h('span', { class: 'rest__time' });
  const labelEl = h('span', { class: 'rest__label' });
  const fillEl = h('div', { class: 'rest__fill' });

  node = h(
    'div',
    { class: 'rest hidden', role: 'timer', 'aria-live': 'off' },
    fillEl,
    h(
      'div',
      { class: 'rest__inner' },
      timeEl,
      labelEl,
      h('button', { type: 'button', class: 'rest__btn', onClick: () => addRestTime(-15) }, '−15s'),
      h('button', { type: 'button', class: 'rest__btn', onClick: () => addRestTime(15) }, '+15s'),
      h('button', { type: 'button', class: 'rest__btn', onClick: () => stopRest() }, 'Salta'),
    ),
  );

  root.append(node);
  onRestChange(update);
  update(getRestState());
  return node;
}

function update(rest) {
  if (!node) return;

  if (!rest.running) {
    node.classList.add('hidden');
    return;
  }

  node.classList.remove('hidden');
  node.classList.toggle('is-over', rest.over);

  const seconds = Math.ceil(rest.remainingMs / 1000);
  node.querySelector('.rest__time').textContent = rest.over ? 'Vai!' : mmss(seconds);
  node.querySelector('.rest__label').textContent = rest.over
    ? 'Recupero finito'
    : rest.label || 'Recupero';

  const progress = rest.totalMs > 0 ? rest.remainingMs / rest.totalMs : 0;
  node.querySelector('.rest__fill').style.transform = `scaleX(${progress})`;
}
