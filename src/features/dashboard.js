/**
 * Dashboard — one screen, one question: what am I doing today?
 *
 * Everything else the brief asks for exists, but nothing else is on the
 * critical path. The session is one tap away; the rest lives behind a
 * single "Altro" row, so a beginner is never asked to choose between eleven
 * features before they can lift.
 */

import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { stat, navRow } from '../ui/components.js';
import { state, plannedSession, prefs } from '../core/state.js';
import { buildSession, volume, streak, isTimed } from '../core/training.js';
import { go } from '../core/router.js';
import { WEEKDAYS, sameDay, startOfWeek } from '../utils/date.js';
import { compact, kg } from '../utils/num.js';

export function render() {
  const { template, session: planned } = plannedSession();
  const session = buildSession(planned, state.sets);
  const today = state.sets.filter((s) => sameDay(s.at, new Date()));

  return {
    node: el(
      'div',
      null,
      el(
        'header',
        { class: 'appbar' },
        el(
          'span',
          { class: 'w-8 h-8 grid place-items-center rounded-lg bg-accent text-accent-ink font-black' },
          'G',
        ),
        el('h1', { class: 'flex-1 text-lg font-extrabold tracking-tight' }, 'GymLog'),
        el(
          'button',
          {
            type: 'button',
            class: 'w-11 h-11 grid place-items-center rounded-full text-ink-2 active:bg-surface-2',
            'aria-label': 'Altro',
            onClick: () => go('/more'),
          },
          icon('more', 'w-6 h-6'),
        ),
      ),

      el(
        'main',
        { class: 'screen' },

        /* ------------------------------------------------ today's session */
        el(
          'section',
          {
            class: 'rounded-xl3 border border-line p-5 relative overflow-hidden',
            style: {
              backgroundImage:
                'linear-gradient(160deg, rgb(var(--accent) / 0.14), transparent 55%), linear-gradient(rgb(var(--surface)), rgb(var(--surface)))',
            },
          },
          el(
            'p',
            { class: 'text-[11px] font-extrabold uppercase tracking-[0.16em] text-accent' },
            session.complete ? 'Fatto oggi' : 'Oggi ti alleni',
          ),
          el('h2', { class: 'mt-1 text-3xl font-black tracking-tighter leading-none' }, session.name),
          el('p', { class: 'mt-1 text-sm text-ink-2' }, `${template.name} · ${session.focus}`),

          weekStrip(),

          el(
            'ol',
            { class: 'mt-1 border-t border-line/70' },
            session.lifts.map((lift) =>
              el(
                'li',
                { class: 'flex items-center gap-3 py-3 border-b border-line/70' },
                el(
                  'span',
                  {
                    class: [
                      'w-[22px] h-[22px] shrink-0 grid place-items-center rounded-full border text-[13px] font-black',
                      lift.done
                        ? 'bg-accent border-transparent text-accent-ink'
                        : 'border-line text-transparent',
                    ],
                  },
                  '✓',
                ),
                el(
                  'span',
                  { class: 'flex-1 min-w-0 flex flex-col' },
                  el(
                    'span',
                    { class: ['font-bold truncate', lift.done && 'text-ink-3 line-through'] },
                    lift.name,
                  ),
                  el(
                    'span',
                    { class: 'text-[13px] text-ink-3 num' },
                    isTimed(lift.exerciseId)
                      ? `${lift.sets} × ${lift.target.reps}s`
                      : `${lift.sets} × ${lift.target.reps} · ${kg(lift.target.weight)} kg`,
                  ),
                ),
                lift.logged.length && !lift.done
                  ? el(
                      'span',
                      { class: 'chip chip-on shrink-0 num' },
                      `${lift.logged.length}/${lift.sets}`,
                    )
                  : null,
              ),
            ),
          ),
        ),

        /* ---------------------------------------------------------- stats */
        el(
          'section',
          { class: 'tile mt-4 grid grid-cols-3 gap-3' },
          stat(String(today.length), 'serie oggi', { accent: today.length > 0 }),
          stat(compact(volume(today)), 'kg oggi'),
          stat(String(streak(state.sets)), 'streak'),
        ),

        /* --------------------------------------------------------- shortcuts */
        el(
          'nav',
          { class: 'mt-4 flex flex-col gap-2', 'aria-label': 'Scorciatoie' },
          navRow({
            title: 'Timer',
            sub: 'Recupero, HIIT, EMOM, Tabata',
            iconName: 'timer',
            onClick: () => go('/timer'),
          }),
          navRow({
            title: 'Esercizi',
            sub: 'Cerca, guarda come si esegue',
            iconName: 'dumbbell',
            onClick: () => go('/exercises'),
          }),
          navRow({
            title: 'Progressi',
            sub: 'Volume, record, muscoli',
            iconName: 'chart',
            onClick: () => go('/stats'),
          }),
        ),
      ),

      el(
        'div',
        { class: 'dock' },
        el(
          'button',
          {
            type: 'button',
            class: 'btn-hero',
            disabled: session.complete,
            onClick: () => go('/session'),
          },
          session.complete
            ? 'COMPLETATO'
            : session.started
              ? `RIPRENDI · ${session.setsDone}/${session.setsTotal}`
              : 'INIZIA',
        ),
      ),
    ),
  };
}

/** Seven days at a glance. A chart would say the same thing with more ink. */
function weekStrip() {
  const start = startOfWeek(new Date());
  const today = new Date();

  return el(
    'div',
    { class: 'flex gap-1.5 my-4', role: 'list', 'aria-label': 'Questa settimana' },
    WEEKDAYS.map((letter, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      const trained = state.sets.some((s) => sameDay(s.at, day));
      const isToday = sameDay(day, today);

      return el(
        'span',
        {
          role: 'listitem',
          class: [
            'flex-1 h-9 grid place-items-center rounded-lg text-[11px] font-extrabold',
            trained ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-3',
            isToday && !trained && 'ring-1 ring-accent/50',
          ],
          'aria-label': `${letter}: ${trained ? 'allenato' : 'riposo'}`,
        },
        letter,
      );
    }),
  );
}
