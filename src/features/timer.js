/**
 * Timers.
 *
 * The rest timer runs as a service — it has to survive leaving the screen,
 * because the whole point is that you keep using the app while it counts.
 * The interval timers (HIIT, EMOM, Tabata, circuit) share the same engine
 * and differ only in the sequence they generate.
 *
 * Everything is driven by an absolute end time rather than a decrementing
 * counter: browsers throttle timers in background tabs, and a counter would
 * end up minutes wrong exactly when you are not looking at it.
 */

import { el } from '../ui/el.js';
import { appbar } from '../ui/components.js';
import { emit, on } from '../core/bus.js';
import { audio, haptics, notify, screen as wakeScreen } from '../platform/index.js';
import { prefs } from '../core/state.js';
import { go } from '../core/router.js';
import { mmss } from '../utils/date.js';

/* ============================================================ rest timer */

let endsAt = 0;
let total = 0;
let ticker = null;
let fired = false;

export function restState() {
  if (!endsAt) return { running: false, remaining: 0, total: 0, over: false };
  const ms = endsAt - Date.now();
  return {
    running: true,
    remaining: Math.max(0, Math.round(ms / 1000)),
    total,
    over: ms <= 0,
  };
}

export function startRest(seconds = prefs.get('restDefault')) {
  stopRest();
  total = seconds;
  endsAt = Date.now() + seconds * 1000;
  fired = false;

  ticker = setInterval(() => {
    if (endsAt - Date.now() <= 0 && !fired) {
      fired = true;
      if (prefs.get('sound')) audio.beep();
      if (prefs.get('vibration')) haptics.alarm();
      notify.show('Recupero finito', 'Vai con la prossima serie.');
      emit('rest', restState());
      // Lingers a few seconds past zero: people look up late.
      setTimeout(stopRest, 6000);
      return;
    }
    emit('rest', restState());
  }, 250);

  emit('rest', restState());
}

export function addRest(seconds) {
  if (!endsAt) return;
  endsAt += seconds * 1000;
  total += seconds;
  fired = false;
  emit('rest', restState());
}

export function stopRest() {
  clearInterval(ticker);
  ticker = null;
  endsAt = 0;
  total = 0;
  fired = false;
  emit('rest', restState());
}

/* ================================================== interval engine (HIIT) */

export const PRESETS = [
  {
    id: 'tabata',
    name: 'Tabata',
    blurb: '20s lavoro / 10s pausa × 8',
    build: () => sequence({ work: 20, rest: 10, rounds: 8 }),
  },
  {
    id: 'emom',
    name: 'EMOM',
    blurb: 'Ogni minuto, 10 round',
    build: () => sequence({ work: 60, rest: 0, rounds: 10 }),
  },
  {
    id: 'hiit',
    name: 'HIIT',
    blurb: '40s lavoro / 20s pausa × 10',
    build: () => sequence({ work: 40, rest: 20, rounds: 10 }),
  },
  {
    id: 'circuito',
    name: 'Circuito',
    blurb: '45s per stazione × 6, 2 giri',
    build: () => sequence({ work: 45, rest: 15, rounds: 6, cycles: 2 }),
  },
];

function sequence({ work, rest, rounds, cycles = 1 }) {
  const steps = [];
  for (let c = 0; c < cycles; c += 1) {
    for (let r = 0; r < rounds; r += 1) {
      steps.push({ kind: 'work', seconds: work, round: r + 1, of: rounds });
      if (rest > 0) steps.push({ kind: 'rest', seconds: rest, round: r + 1, of: rounds });
    }
  }
  return steps;
}

/* ------------------------------------------------------------ the screen */

export function render() {
  let steps = null;
  let stepIndex = 0;
  let stepEnds = 0;
  let loop = null;

  const clock = el('p', { class: 'text-7xl font-black num tracking-tighter' }, '0:00');
  const phase = el('p', { class: 'label' }, 'Pronto');
  const meta = el('p', { class: 'text-sm text-ink-3 mt-1' }, 'Scegli un formato');
  const stage = el('div', {
    class: 'rounded-xl3 border border-line bg-surface p-8 text-center transition-colors',
  });

  stage.append(phase, clock, meta);

  const stop = () => {
    clearInterval(loop);
    loop = null;
    steps = null;
    stage.classList.remove('bg-accent', 'text-accent-ink');
    phase.textContent = 'Pronto';
    clock.textContent = '0:00';
    meta.textContent = 'Scegli un formato';
    wakeScreen.keepAwake(false);
  };

  const advance = () => {
    stepIndex += 1;
    if (stepIndex >= steps.length) {
      if (prefs.get('sound')) audio.beep([880, 1175, 1320]);
      haptics.alarm();
      notify.show('Finito', 'Sessione a intervalli completata.');
      stop();
      return;
    }
    stepEnds = Date.now() + steps[stepIndex].seconds * 1000;
    if (prefs.get('sound')) audio.beep([660]);
    haptics.ok();
  };

  const paint = () => {
    if (!steps) return;
    const step = steps[stepIndex];
    const left = Math.max(0, Math.ceil((stepEnds - Date.now()) / 1000));
    clock.textContent = mmss(left);
    phase.textContent = step.kind === 'work' ? 'Lavora' : 'Recupera';
    meta.textContent = `Round ${step.round} di ${step.of}`;
    stage.classList.toggle('bg-accent', step.kind === 'work');
    stage.classList.toggle('text-accent-ink', step.kind === 'work');
    if (left <= 0) advance();
  };

  const startPreset = (preset) => {
    audio.unlock();
    steps = preset.build();
    stepIndex = 0;
    stepEnds = Date.now() + steps[0].seconds * 1000;
    wakeScreen.keepAwake(true);
    clearInterval(loop);
    loop = setInterval(paint, 200);
    paint();
  };

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Timer', back: () => go('/') }),
      el(
        'main',
        { class: 'screen' },
        stage,
        el(
          'div',
          { class: 'grid grid-cols-2 gap-2 mt-4' },
          PRESETS.map((preset) =>
            el(
              'button',
              {
                type: 'button',
                class:
                  'rounded-2xl bg-surface border border-line p-4 text-left transition active:scale-[0.98] active:border-accent/50',
                onClick: () => startPreset(preset),
              },
              el('span', { class: 'block font-extrabold' }, preset.name),
              el('span', { class: 'block text-xs text-ink-3 mt-0.5' }, preset.blurb),
            ),
          ),
        ),
        el(
          'div',
          { class: 'grid grid-cols-3 gap-2 mt-4' },
          [60, 90, 120, 150, 180, 240].map((s) =>
            el(
              'button',
              {
                type: 'button',
                class: 'btn-ghost',
                onClick: () => {
                  audio.unlock();
                  startRest(s);
                  go('/');
                },
              },
              mmss(s),
            ),
          ),
        ),
        el(
          'button',
          { type: 'button', class: 'btn-ghost w-full mt-4', onClick: stop },
          'Ferma',
        ),
      ),
    ),
    destroy: () => {
      clearInterval(loop);
      wakeScreen.keepAwake(false);
    },
  };
}

/* ------------------------------------------------- the persistent rest bar */

export function mountRestBar(root) {
  const host = el('div');
  root.appendChild(host);

  on('rest', (rest) => {
    if (!rest.running) {
      host.replaceChildren();
      return;
    }

    const left = rest.total ? Math.max(0, rest.remaining / rest.total) : 0;

    host.replaceChildren(
      el(
        'div',
        {
          class: [
            'fixed left-3 right-3 z-40 mx-auto max-w-lg flex items-stretch rounded-2xl overflow-hidden shadow-2xl transition-colors',
            rest.over ? 'bg-accent text-accent-ink' : 'bg-surface-3',
          ],
          style: { bottom: 'calc(112px + env(safe-area-inset-bottom, 0px))' },
          role: 'timer',
          'aria-live': 'off',
        },
        el(
          'button',
          {
            type: 'button',
            class: 'flex-1 min-w-0 flex items-center justify-between gap-3 px-5 py-4 text-left',
            'aria-label': 'Chiudi il recupero',
            onClick: stopRest,
          },
          el('span', { class: 'label' }, rest.over ? 'Vai' : 'Recupero'),
          el('span', { class: 'text-2xl font-black num' }, mmss(rest.remaining)),
          // Hairline progress: tinting the whole bar makes the time harder to read.
          el('span', {
            class: 'absolute left-0 bottom-0 h-[3px] bg-accent origin-left',
            style: { width: '100%', transform: `scaleX(${left.toFixed(3)})` },
          }),
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'px-5 font-extrabold border-l border-black/20',
            onClick: () => addRest(30),
          },
          '+30',
        ),
      ),
    );
  });
}
