/**
 * The session — one exercise at a time.
 *
 * This is the screen used while out of breath, so it holds exactly four
 * things: where you are, what to lift, the two numbers, and one button.
 * Both numbers arrive prefilled from the plan, which means repeating a set
 * is a single tap and nothing else.
 */

import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, stepper, toast } from '../ui/components.js';
import { state, logSet, removeSet, plannedSession, prefs } from '../core/state.js';
import { buildSession, isTimed, isBodyweight, stepFor } from '../core/training.js';
import { go, back } from '../core/router.js';
import { startRest } from './timer.js';
import { screen as wakeScreen, haptics } from '../platform/index.js';
import { kg } from '../utils/num.js';

/** Which lift we are on. Held across re-renders so the screen never jumps
    to the next exercise under your hands the moment you finish a set. */
let cursor = null;
let cursorFor = null;

export function render({ params }) {
  const { session: planned } = plannedSession();
  const session = buildSession(planned, state.sets);

  if (cursorFor !== session.id) {
    cursorFor = session.id;
    cursor = session.nextIndex;
  }
  if (params?.index !== undefined) cursor = Number(params.index);

  const index = Math.min(Math.max(0, cursor ?? 0), session.lifts.length - 1);
  const lift = session.lifts[index];
  const timed = isTimed(lift.exerciseId);
  const bodyweight = isBodyweight(lift.exerciseId);

  const last = lift.logged[lift.logged.length - 1];
  let weight = last ? last.weight : lift.target.weight;
  let reps = last ? last.reps : lift.target.reps;

  if (prefs.get('keepAwake')) wakeScreen.keepAwake(true);

  const node = el(
    'div',
    null,
    appbar({
      title: session.name,
      back: () => go('/'),
      action: el(
        'span',
        { class: 'chip num shrink-0', 'aria-label': `Esercizio ${index + 1} di ${session.lifts.length}` },
        `${index + 1}/${session.lifts.length}`,
      ),
    }),

    /* Session progress. A bar reads faster than a fraction. */
    el(
      'div',
      {
        class: 'sticky top-[60px] z-10 h-1 bg-line',
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': String(session.setsTotal),
        'aria-valuenow': String(session.setsDone),
        'aria-label': 'Avanzamento allenamento',
      },
      el('span', {
        class: 'block h-full bg-accent origin-left transition-transform duration-300',
        style: { transform: `scaleX(${(session.setsDone / session.setsTotal).toFixed(3)})` },
      }),
    ),

    el(
      'main',
      { class: 'screen' },

      el(
        'div',
        { class: 'mb-5' },
        el('h2', { class: 'text-3xl font-black tracking-tighter leading-none' }, lift.name),
        el(
          'p',
          { class: 'mt-2 text-lg font-bold text-accent num' },
          timed
            ? `${lift.sets} serie da ${lift.target.reps}s`
            : bodyweight
              ? `${lift.sets} serie da ${lift.target.reps}`
              : `${lift.sets} × ${lift.target.reps} · ${kg(lift.target.weight)} kg`,
        ),
        el('p', { class: 'mt-2 text-[13px] text-ink-3' }, lift.target.why),
      ),

      /* The two numbers. Weight is hidden where it has no meaning. */
      el(
        'div',
        { class: 'flex flex-col gap-3' },
        timed || bodyweight
          ? null
          : stepper({
              label: 'KG',
              value: weight,
              step: stepFor(lift),
              format: kg,
              onChange: (v) => {
                weight = v;
              },
            }),
        stepper({
          label: timed ? 'SEC' : 'REPS',
          value: reps,
          step: timed ? 5 : 1,
          min: 1,
          onChange: (v) => {
            reps = v;
          },
        }),
      ),

      /* What is left, as dots you can read without counting. */
      el(
        'section',
        { class: 'mt-7' },
        el(
          'h3',
          { class: 'label mb-2' },
          lift.done
            ? `Fatte tutte e ${lift.sets}`
            : `Ne mancano ${lift.sets - lift.logged.length} su ${lift.sets}`,
        ),
        el(
          'div',
          { class: 'flex gap-1.5 mb-3', 'aria-hidden': 'true' },
          Array.from({ length: lift.sets }, (_, i) =>
            el('span', {
              class: [
                'flex-1 h-1.5 rounded-full',
                i < lift.logged.length ? 'bg-accent' : 'bg-surface-2',
              ],
            }),
          ),
        ),
        el(
          'div',
          { class: 'flex flex-col gap-2' },
          lift.logged.map((entry, i) =>
            el(
              'div',
              { class: 'flex items-center gap-3 rounded-xl bg-surface border border-line px-4 py-3' },
              el(
                'span',
                { class: 'w-6 h-6 grid place-items-center rounded-lg bg-surface-2 text-[13px] font-black text-ink-3' },
                String(i + 1),
              ),
              el(
                'span',
                { class: 'font-bold num' },
                timed ? `${entry.reps}s` : `${kg(entry.weight)} kg × ${entry.reps}`,
              ),
              el(
                'button',
                {
                  type: 'button',
                  class: 'ml-auto w-10 h-10 grid place-items-center rounded-full text-ink-3 active:text-danger',
                  'aria-label': `Elimina serie ${i + 1}`,
                  onClick: () => removeSet(entry.id),
                },
                icon('close', 'w-5 h-5'),
              ),
            ),
          ),
        ),
      ),
    ),

    el(
      'div',
      { class: 'dock' },
      lift.done
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn-hero',
              onClick: () => {
                if (index + 1 < session.lifts.length) {
                  cursor = index + 1;
                  go(`/session/${cursor}`);
                } else {
                  wakeScreen.keepAwake(false);
                  toast('Allenamento chiuso. Bel lavoro.', { variant: 'ok' });
                  go('/');
                }
              },
            },
            index + 1 < session.lifts.length ? 'PROSSIMO ESERCIZIO' : 'CHIUDI ALLENAMENTO',
          )
        : el(
            'button',
            {
              type: 'button',
              class: 'btn-hero',
              onClick: async () => {
                haptics.ok();
                await logSet({
                  exerciseId: lift.exerciseId,
                  name: lift.name,
                  weight: timed || bodyweight ? 0 : weight,
                  reps,
                  sessionId: session.id,
                });
                startRest(lift.rest);
              },
            },
            'FATTO',
          ),
    ),
  );

  return { node, destroy: () => {} };
}
