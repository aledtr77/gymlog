/**
 * Home — today's session, already decided.
 *
 * Nothing here is empty on first open: the plan ships with the app, so a
 * beginner sees a real workout with real exercises and real loads before
 * they have done anything at all. There is one button.
 */

import { h } from './dom.js';
import { state } from '../core/store.js';
import { todaySession } from '../core/plan.js';
import { byDay, volume } from '../core/log.js';
import { compact, kg } from '../core/format.js';

export function todayScreen(ctx) {
  const session = todaySession(state.entries);
  const days = byDay(state.entries);
  const week = weekDots(state.entries);

  return h(
    'div',
    null,
    h(
      'header',
      { class: 'top' },
      h('span', { class: 'top__brand' }, 'G'),
      h('h1', { class: 'top__title' }, 'GymLog'),
      days.length
        ? h('button', { type: 'button', class: 'top__link', onClick: ctx.toHistory }, 'Storico')
        : null,
    ),
    h(
      'main',
      { class: 'wrap' },

      h(
        'section',
        { class: 'plan' },
        h(
          'div',
          { class: 'plan__head' },
          h('span', { class: 'plan__kicker' }, session.complete ? 'Fatto oggi' : 'Oggi ti alleni'),
          h('h2', { class: 'plan__name' }, session.day.name),
          h('p', { class: 'plan__focus' }, session.day.focus),
        ),
        h('div', { class: 'week' }, week),
        h(
          'ol',
          { class: 'plan__list' },
          session.exercises.map((ex) =>
            h(
              'li',
              { class: ['plan__item', ex.done && 'is-done'] },
              h('span', { class: 'plan__tick' }, ex.done ? '✓' : ''),
              h(
                'span',
                { class: 'plan__main' },
                h('span', { class: 'plan__ex' }, ex.name),
                h(
                  'span',
                  { class: 'plan__sets' },
                  ex.exerciseId === 'plank'
                    ? `${ex.sets} × ${ex.target.reps}s`
                    : `${ex.sets} × ${ex.target.reps} · ${kg(ex.target.weight)} kg`,
                ),
              ),
              ex.logged.length && !ex.done
                ? h('span', { class: 'plan__part' }, `${ex.logged.length}/${ex.sets}`)
                : null,
            ),
          ),
        ),
      ),

      session.complete
        ? h(
            'div',
            { class: 'closing' },
            h('span', { class: 'closing__v' }, `${compact(volume(session.exercises.flatMap((e) => e.logged)))} kg`),
            h('span', { class: 'closing__l' }, 'sollevati oggi. Ci vediamo alla prossima.'),
          )
        : null,
    ),

    h(
      'div',
      { class: 'action' },
      h(
        'button',
        { type: 'button', class: 'record', onClick: ctx.toSession, disabled: session.complete },
        session.complete
          ? 'ALLENAMENTO COMPLETATO'
          : session.started
            ? `RIPRENDI · ${session.setsDone}/${session.setsTotal}`
            : 'INIZIA',
      ),
    ),
  );
}

/** The last seven days, so you can see your rhythm without a chart. */
function weekDots(entries) {
  const days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const trained = entries.some((e) => new Date(e.at).toDateString() === d.toDateString());
    days.push(
      h(
        'span',
        {
          class: ['week__d', trained && 'is-on', i === 0 && 'is-today'],
          'aria-label': trained ? 'Allenato' : 'Riposo',
        },
        ['L', 'M', 'M', 'G', 'V', 'S', 'D'][(d.getDay() + 6) % 7],
      ),
    );
  }
  return days;
}
