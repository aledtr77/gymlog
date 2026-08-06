/**
 * Screen 2 — record a set.
 *
 * The design rule here is that you should be able to use it while out of
 * breath and not looking properly:
 *
 * - both numbers arrive prefilled with what you did last time, so repeating
 *   a set means pressing one button and nothing else;
 * - you change them with big plus/minus keys, never the phone keyboard,
 *   which on a sweaty hand is the difference between working and not
 *   (tapping the number itself still lets you type, for the odd 82,5);
 * - one button records. It is the largest thing on the screen.
 */

import { h } from './dom.js';
import { state, addSet, removeSet } from '../core/store.js';
import { lastSession, todayFor } from '../core/log.js';
import { kg } from '../core/format.js';
import { tap } from '../core/feedback.js';
import { startRest } from '../core/rest.js';

const KG_STEP = 2.5;

export function exerciseScreen(exercise, ctx) {
  const previous = lastSession(state.entries, exercise.id);
  const doneToday = todayFor(state.entries, exercise.id);
  const latest = doneToday[doneToday.length - 1] || previous;

  let weight = latest ? latest.weight : 20;
  let reps = latest ? latest.reps : 8;

  const weightValue = h('button', { type: 'button', class: 'step__value' });
  const repsValue = h('button', { type: 'button', class: 'step__value' });

  paint();

  function paint() {
    weightValue.textContent = kg(weight);
    repsValue.textContent = String(reps);
  }

  function bump(field, delta) {
    if (field === 'weight') weight = Math.max(0, Math.round((weight + delta) * 100) / 100);
    else reps = Math.max(1, reps + delta);
    tap();
    paint();
  }

  // Tapping the number is the escape hatch for values the keys would take
  // too long to reach.
  weightValue.onclick = () => {
    const typed = window.prompt('Peso in kg', String(weight).replace('.', ','));
    if (typed === null) return;
    const parsed = Number(typed.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) weight = parsed;
    paint();
  };

  repsValue.onclick = () => {
    const typed = window.prompt('Ripetizioni', String(reps));
    if (typed === null) return;
    const parsed = parseInt(typed, 10);
    if (Number.isFinite(parsed) && parsed > 0) reps = parsed;
    paint();
  };

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
      h('h1', { class: 'top__title' }, exercise.name),
    ),
    h(
      'main',
      { class: 'wrap' },
      // Only claim "first time" when there is genuinely nothing: saying it
      // with sets already listed below reads as a bug.
      previous
        ? h(
            'p',
            { class: 'previous' },
            'Ultima volta: ',
            h('b', null, `${kg(previous.weight)} kg × ${previous.reps}`),
          )
        : doneToday.length
          ? null
          : h('p', { class: 'previous' }, 'Prima volta su questo esercizio'),
      h(
        'div',
        { class: 'steps' },
        stepper('KG', weightValue, () => bump('weight', -KG_STEP), () => bump('weight', KG_STEP)),
        stepper('REPS', repsValue, () => bump('reps', -1), () => bump('reps', 1)),
      ),
      doneToday.length
        ? h(
            'div',
            { class: 'sets' },
            h(
              'h2',
              { class: 'sets__title' },
              `Oggi · ${doneToday.length} ${doneToday.length === 1 ? 'serie' : 'serie'}`,
            ),
            doneToday.map((entry, index) =>
              h(
                'div',
                { class: 'set' },
                h('span', { class: 'set__n' }, String(index + 1)),
                h('span', { class: 'set__v' }, `${kg(entry.weight)} kg × ${entry.reps}`),
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'set__del',
                    'aria-label': 'Elimina questa serie',
                    onClick: () => removeSet(entry.id),
                  },
                  '×',
                ),
              ),
            ),
          )
        : null,
    ),
    // Pinned to the bottom edge: it is the one action on this screen, and
    // that is where the thumb already is.
    h(
      'div',
      { class: 'action' },
      h(
        'button',
        {
          type: 'button',
          class: 'record',
          onClick: async () => {
            tap();
            await addSet({ exerciseId: exercise.id, name: exercise.name, weight, reps });
            startRest();
          },
        },
        'FATTO',
      ),
    ),
  );
}

function stepper(label, valueEl, onMinus, onPlus) {
  return h(
    'div',
    { class: 'step' },
    h('span', { class: 'step__label' }, label),
    h(
      'div',
      { class: 'step__controls' },
      h('button', { type: 'button', class: 'step__key', onClick: onMinus, 'aria-label': `Meno ${label}` }, '−'),
      valueEl,
      h('button', { type: 'button', class: 'step__key', onClick: onPlus, 'aria-label': `Più ${label}` }, '+'),
    ),
  );
}
