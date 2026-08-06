/**
 * Screen 3 — what you did, by day. Read-only, and that is all it is for.
 */

import { h } from './dom.js';
import { state } from '../core/store.js';
import { byDay, volume } from '../core/log.js';
import { compact, dayLabel, kg } from '../core/format.js';

export function historyScreen(ctx) {
  const days = byDay(state.entries);

  return h(
    'div',
    null,
    h(
      'header',
      { class: 'top' },
      h(
        'button',
        { type: 'button', class: 'top__back', onClick: ctx.toList, 'aria-label': 'Indietro' },
        '‹',
      ),
      h('h1', { class: 'top__title' }, 'Storico'),
    ),
    h(
      'main',
      { class: 'wrap' },
      days.length
        ? days.map((day) =>
            h(
              'section',
              { class: 'day' },
              h(
                'div',
                { class: 'day__head' },
                h('span', { class: 'day__name' }, dayLabel(day.date)),
                h('span', { class: 'day__vol' }, `${compact(volume(day.entries))} kg`),
              ),
              h(
                'div',
                { class: 'day__sets' },
                day.entries.map((entry) =>
                  h(
                    'div',
                    { class: 'set' },
                    h('span', { class: 'set__v grow' }, entry.name),
                    h('span', { class: 'set__v' }, `${kg(entry.weight)} kg × ${entry.reps}`),
                  ),
                ),
              ),
            ),
          )
        : h('p', { class: 'blank' }, 'Ancora niente. Registra una serie.'),
    ),
  );
}
