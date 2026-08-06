/**
 * Rest bar. Appears when you record a set, counts down, gets out of the way.
 * Tap it to dismiss, "+30" if you need longer. No settings.
 */

import { h, replace } from './dom.js';
import { addRest, onRest, stopRest } from '../core/rest.js';
import { mmss } from '../core/format.js';

export function mountRestBar(root) {
  const host = h('div');
  root.appendChild(host);

  onRest((rest) => {
    if (!rest.running) {
      replace(host);
      return;
    }

    replace(
      host,
      h(
        'div',
        { class: ['rest', rest.over && 'rest--over'] },
        h(
          'button',
          {
            type: 'button',
            class: 'rest__main',
            onClick: stopRest,
            'aria-label': 'Chiudi il recupero',
          },
          h('span', { class: 'rest__label' }, rest.over ? 'Vai' : 'Recupero'),
          h('span', { class: 'rest__time' }, mmss(rest.remaining)),
        ),
        h(
          'button',
          { type: 'button', class: 'rest__more', onClick: () => addRest(30) },
          '+30',
        ),
      ),
    );
  });
}
