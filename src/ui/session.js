/**
 * The session — one exercise at a time.
 *
 * Everything you need is on screen and nothing else: where you are in the
 * workout, what to lift, how to do it, and one button. You never choose an
 * exercise, never build anything, never open a menu. The app walks and you
 * follow.
 */

import { h } from './dom.js';
import { state, addSet, removeSet } from '../core/store.js';
import { todaySession, stepFor } from '../core/plan.js';
import { kg } from '../core/format.js';
import { tap } from '../core/feedback.js';
import { startRest, stopRest } from '../core/rest.js';

export function sessionScreen(ctx, cursor) {
  const session = todaySession(state.entries);
  const index = Math.min(Math.max(0, cursor ?? 0), session.exercises.length - 1);
  const ex = session.exercises[index];
  const isTime = ex.exerciseId === 'plank';
  const step = stepFor(ex);

  let weight = ex.logged.length ? ex.logged[ex.logged.length - 1].weight : ex.target.weight;
  let reps = ex.logged.length ? ex.logged[ex.logged.length - 1].reps : ex.target.reps;

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

  const ask = (label, current, apply) => {
    const typed = window.prompt(label, String(current).replace('.', ','));
    if (typed === null) return;
    const parsed = Number(typed.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) apply(parsed);
    paint();
  };

  weightValue.onclick = () => ask('Peso in kg', weight, (v) => {
    weight = v;
  });
  repsValue.onclick = () => ask(isTime ? 'Secondi' : 'Ripetizioni', reps, (v) => {
    reps = Math.max(1, Math.round(v));
  });

  const remaining = Math.max(0, ex.sets - ex.logged.length);

  return h(
    'div',
    null,
    h(
      'header',
      { class: 'top' },
      h(
        'button',
        { type: 'button', class: 'top__back', onClick: ctx.toToday, 'aria-label': 'Esci' },
        '‹',
      ),
      h('h1', { class: 'top__title' }, session.day.name),
      h('span', { class: 'top__count' }, `${index + 1}/${session.exercises.length}`),
    ),

    // A bar rather than a number: progress through the whole session should
    // be readable without being counted.
    h(
      'div',
      { class: 'bar' },
      h('span', {
        class: 'bar__fill',
        style: { transform: `scaleX(${(session.setsDone / session.setsTotal).toFixed(3)})` },
      }),
    ),

    h(
      'main',
      { class: 'wrap' },
      h(
        'div',
        { class: 'lift' },
        h('h2', { class: 'lift__name' }, ex.name),
        h(
          'p',
          { class: 'lift__goal' },
          isTime
            ? `${ex.sets} serie da ${ex.target.reps} secondi`
            : `${ex.sets} serie da ${ex.target.reps} · ${kg(ex.target.weight)} kg`,
        ),
        ex.note ? h('p', { class: 'lift__note' }, ex.note) : null,
        h('p', { class: 'lift__why' }, ex.target.why),
      ),

      h(
        'div',
        { class: 'steps' },
        isTime
          ? null
          : stepper('KG', weightValue, () => bump('weight', -step), () => bump('weight', step)),
        stepper(isTime ? 'SEC' : 'REPS', repsValue, () => bump('reps', isTime ? -5 : -1), () =>
          bump('reps', isTime ? 5 : 1),
        ),
      ),

      h(
        'div',
        { class: 'sets' },
        h(
          'h3',
          { class: 'sets__title' },
          remaining ? `Ne mancano ${remaining} su ${ex.sets}` : `Fatte tutte e ${ex.sets}`,
        ),
        h(
          'div',
          { class: 'dots' },
          Array.from({ length: ex.sets }, (_, i) =>
            h('span', { class: ['dot', i < ex.logged.length && 'is-on'] }),
          ),
        ),
        ex.logged.map((entry, i) =>
          h(
            'div',
            { class: 'set' },
            h('span', { class: 'set__n' }, String(i + 1)),
            h(
              'span',
              { class: 'set__v' },
              isTime ? `${entry.reps}s` : `${kg(entry.weight)} kg × ${entry.reps}`,
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'set__del',
                'aria-label': 'Elimina',
                onClick: () => removeSet(entry.id),
              },
              '×',
            ),
          ),
        ),
      ),
    ),

    h(
      'div',
      { class: 'action' },
      ex.done
        ? h(
            'button',
            {
              type: 'button',
              class: 'record',
              onClick: () => {
                stopRest();
                if (index + 1 < session.exercises.length) ctx.toSession(index + 1);
                else ctx.toToday();
              },
            },
            index + 1 < session.exercises.length ? 'PROSSIMO ESERCIZIO' : 'CHIUDI ALLENAMENTO',
          )
        : h(
            'button',
            {
              type: 'button',
              class: 'record',
              onClick: async () => {
                tap();
                await addSet({
                  exerciseId: ex.exerciseId,
                  name: ex.name,
                  weight: isTime ? 0 : weight,
                  reps,
                  dayId: session.day.id,
                });
                startRest(ex.rest);
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
