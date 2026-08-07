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
import { go } from '../core/router.js';
import { startRest } from '../services/timer.js';
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
      heading: lift.name,
      back: () => go('/'),
      action: el(
        'span',
        { class: 'chip num shrink-0', 'aria-label': `Exercise ${index + 1} of ${session.lifts.length}` },
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
        'aria-label': 'Workout progress',
      },
      el('span', {
        class: 'block h-full bg-accent origin-left transition-transform duration-300',
        style: { transform: `scaleX(${(session.setsDone / session.setsTotal).toFixed(3)})` },
      }),
    ),

    el(
      'main',
      { class: 'screen workout-screen' },
      el(
        'section',
        { class: 'workspace workout-workspace' },
        el(
          'header',
          { class: 'workspace__head' },
          el('span', { class: 'workspace__icon' }, icon('dumbbell', 'w-6 h-6')),
          el(
            'div',
            { class: 'min-w-0 flex-1' },
            el('h2', { class: 'workspace__title' }, lift.name),
            el(
              'p',
              { class: 'mt-1.5 text-base font-bold text-accent num' },
              timed
                ? `${lift.sets} sets of ${lift.target.reps}s`
                : bodyweight
                  ? `${lift.sets} sets of ${lift.target.reps}`
                  : `${lift.sets} × ${lift.target.reps} · ${kg(lift.target.weight)} kg`,
            ),
            el('p', { class: 'workspace__copy' }, lift.target.why),
          ),
        ),
        el(
          'div',
          { class: 'workspace__body workout-layout' },
          el(
            'section',
            { class: 'workout-entry' },
            el('p', { class: 'label mb-3' }, 'Log your next set'),
            el(
              'div',
              { class: 'flex flex-col gap-3' },
              timed || bodyweight
                ? null
                : stepper({ label: 'KG', value: weight, step: stepFor(lift), format: kg, onChange: (v) => { weight = v; } }),
              stepper({ label: timed ? 'SEC' : 'REPS', value: reps, step: timed ? 5 : 1, min: 1, onChange: (v) => { reps = v; } }),
            ),
          ),
          el(
            'section',
            { class: 'surface-group workout-sets' },
            el('div', { class: 'flex items-center justify-between gap-3' }, el('h3', { class: 'font-black' }, 'Sets in this exercise'), el('span', { class: 'chip' }, lift.done ? 'Complete' : `${lift.sets - lift.logged.length} left`)),
            el('div', { class: 'my-4 flex gap-1.5', 'aria-hidden': 'true' }, Array.from({ length: lift.sets }, (_, i) => el('span', { class: ['h-1.5 flex-1 rounded-full', i < lift.logged.length ? 'bg-accent' : 'bg-surface-2'] }))),
            el(
              'div',
              { class: 'flex flex-col gap-2' },
              lift.logged.length
                ? lift.logged.map((entry, i) =>
                    el(
                      'div',
                      { class: 'flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3' },
                      el('span', { class: 'grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-[13px] font-black text-ink-3' }, String(i + 1)),
                      el('span', { class: 'font-bold num' }, timed ? `${entry.reps}s` : `${kg(entry.weight)} kg × ${entry.reps}`),
                      el('button', { type: 'button', class: 'ml-auto grid h-10 w-10 place-items-center rounded-full text-ink-3 active:text-danger', 'aria-label': `Delete set ${i + 1}`, onClick: () => removeSet(entry.id) }, icon('close', 'w-5 h-5')),
                    ),
                  )
                : el('div', { class: 'rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3' }, 'Your completed sets will appear here.'),
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
                  toast('Workout complete. Nice work.', { variant: 'ok' });
                  go('/');
                }
              },
            },
            index + 1 < session.lifts.length ? 'NEXT EXERCISE' : 'FINISH WORKOUT',
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
            'LOG SET',
          ),
    ),
  );

  return { node, destroy: () => {} };
}
