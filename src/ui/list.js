/**
 * Screen 1 — your exercises.
 *
 * Every row answers the only question you have walking up to a machine:
 * "what did I do last time?". Tap the row to record today's set.
 */

import { h } from './dom.js';
import { state, pinExercise } from '../core/store.js';
import { recentExercises, today, volume } from '../core/log.js';
import { compact, kg } from '../core/format.js';
import { openPicker } from './picker.js';

export function listScreen(ctx) {
  const done = today(state.entries);

  // Exercises you have used, plus ones you added but have not logged yet.
  const used = recentExercises(state.entries);
  const usedIds = new Set(used.map((e) => e.exerciseId));
  const rows = [
    ...used,
    ...state.pinned
      .filter((p) => !usedIds.has(p.id))
      .map((p) => ({ exerciseId: p.id, name: p.name, last: null, doneToday: 0 })),
  ];

  return h(
    'div',
    null,
    h(
      'header',
      { class: 'top' },
      h('span', { class: 'top__brand' }, 'G'),
      h('h1', { class: 'top__title' }, 'GymLog'),
      h(
        'button',
        { type: 'button', class: 'top__link', onClick: ctx.toHistory },
        'Storico',
      ),
    ),
    h(
      'main',
      { class: 'wrap' },
      done.length
        ? h(
            'div',
            { class: 'summary' },
            h('span', { class: 'summary__label' }, 'Oggi'),
            h(
              'div',
              { class: 'summary__stats' },
              stat(String(done.length), 'serie'),
              stat(compact(volume(done)), 'kg'),
              stat(String(new Set(done.map((e) => e.exerciseId)).size), 'esercizi'),
            ),
          )
        : null,
      rows.length
        ? h('div', { class: 'rows' }, rows.map((row) => exerciseRow(row, ctx)))
        : h(
            'div',
            { class: 'blank' },
            h('strong', null, 'Comincia da qui'),
            h('span', null, 'Aggiungi un esercizio: da lì in poi ti bastano due tasti e FATTO.'),
          ),
      h(
        'button',
        {
          type: 'button',
          class: 'add',
          onClick: async () => {
            const chosen = await openPicker();
            if (!chosen) return;
            await pinExercise(chosen);
            ctx.toExercise(chosen);
          },
        },
        '+ Aggiungi esercizio',
      ),
    ),
  );
}

function stat(value, label) {
  return h(
    'div',
    { class: 'stat' },
    h('span', { class: 'stat__v' }, value),
    h('span', { class: 'stat__l' }, label),
  );
}

function exerciseRow(row, ctx) {
  return h(
    'button',
    {
      type: 'button',
      class: 'row',
      onClick: () => ctx.toExercise({ id: row.exerciseId, name: row.name }),
    },
    h(
      'span',
      { class: 'row__main' },
      h('span', { class: 'row__name' }, row.name),
      h(
        'span',
        { class: 'row__last' },
        row.last ? `${kg(row.last.weight)} kg × ${row.last.reps}` : 'mai fatto',
      ),
    ),
    row.doneToday
      ? h('span', { class: 'row__today' }, `${row.doneToday}×`)
      : null,
    h('span', { class: 'row__go', 'aria-hidden': 'true' }, '›'),
  );
}
