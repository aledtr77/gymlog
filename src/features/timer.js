/**
 * Timers.
 *
 * The timer runs as a service so it survives leaving the screen. The screen
 * itself deliberately exposes one concept only: choose a rest duration and
 * start the countdown.
 *
 * Everything is driven by an absolute end time rather than a decrementing
 * counter: browsers throttle timers in background tabs, and a counter would
 * end up minutes wrong exactly when you are not looking at it.
 */

import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, workspace } from '../ui/components.js';
import { on } from '../core/bus.js';
import { audio, haptics } from '../platform/index.js';
import { prefs } from '../core/state.js';
import { go } from '../core/router.js';
import { mmss } from '../utils/date.js';
import { timerState, startTimer, stopTimer } from '../services/timer.js';

/* ------------------------------------------------------------ the screen */

export function render() {
  const modes = {
    training: { label: 'Training', hint: 'Your active session', min: 300, max: 5400, step: 300, color: 'green' },
    rest: { label: 'Rest', hint: 'Recovery between sets', min: 30, max: 300, step: 15, color: 'blue' },
  };
  const initial = timerState();
  const values = {
    training: initial.running && initial.kind === 'training' ? initial.total : 1800,
    rest: initial.running && initial.kind === 'rest' ? initial.total : Number(prefs.get('restDefault')) || 90,
  };
  let active = initial.running ? initial.kind : 'training';
  let pausedRemaining = null;
  let dragging = null;

  const clock = el('strong', { class: 'dual-timer__clock num' });
  const phase = el('span', { class: 'dual-timer__phase' });
  const hint = el('span', { class: 'dual-timer__hint' });
  const selectedDuration = el('strong', { class: 'num' });
  const ringFor = {};
  const modeButtons = {};

  const makeRing = (mode) => {
    const ring = el(
      'div',
      {
        class: `dual-ring ${mode === 'training' ? 'dual-ring--green' : 'dual-ring--blue'}`,
        role: 'slider',
        tabindex: '0',
        'aria-label': `${modes[mode].label} duration`,
        'aria-valuemin': String(modes[mode].min),
        'aria-valuemax': String(modes[mode].max),
      },
      el('span', { class: 'dual-ring__hand' }, el('i', { class: 'dual-ring__handle' })),
    );
    ring.onkeydown = (event) => {
      if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key) || timerState().running) return;
      event.preventDefault();
      active = mode;
      const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
      values[mode] = clampAndSnap(values[mode] + modes[mode].step * direction, modes[mode]);
      pausedRemaining = null;
      paint();
    };
    ringFor[mode] = ring;
    return ring;
  };

  const dial = el(
    'div',
    { class: 'dual-timer__dial', role: 'timer', 'aria-live': 'off' },
    makeRing('training'),
    makeRing('rest'),
    el('div', { class: 'dual-timer__core' }, phase, clock, hint),
  );
  const startButton = el('button', { type: 'button', class: 'btn-primary dual-timer__start' });
  const mobileStartButton = el('button', { type: 'button', class: 'dual-timer__mobile-start' });
  const startButtons = [startButton, mobileStartButton];

  const paint = (timer = timerState()) => {
    if (timer.running) active = timer.kind;
    const remaining = timer.running ? timer.remaining : pausedRemaining ?? values[active];
    const counting = timer.running && !timer.over;
    dial.classList.toggle('is-running', counting);
    dial.classList.toggle('is-done', timer.over);
    dial.classList.toggle('is-rest', active === 'rest');
    dial.classList.toggle('is-training', active === 'training');
    clock.textContent = mmss(remaining);
    phase.textContent = timer.over ? `${modes[active].label} complete` : counting ? modes[active].label : pausedRemaining !== null ? 'Paused' : modes[active].label;
    hint.textContent = timer.over ? (active === 'rest' ? 'Ready for your next set' : 'Session finished') : counting ? (active === 'rest' ? 'Recover and breathe' : 'Stay focused') : modes[active].hint;
    const buttonLabel = counting ? 'Pause' : timer.over ? `Start ${modes[active].label.toLowerCase()} again` : pausedRemaining !== null ? 'Resume' : `Start ${modes[active].label.toLowerCase()}`;
    for (const button of startButtons) {
      button.replaceChildren(icon(counting ? 'pause' : 'play', 'w-5 h-5'), buttonLabel);
      button.classList.toggle('is-rest', active === 'rest');
      button.classList.toggle('is-training', active === 'training');
    }

    for (const mode of Object.keys(modes)) {
      const config = modes[mode];
      const baseAngle = angleFor(values[mode], config);
      const ratio = timer.running && timer.kind === mode ? timer.remaining / values[mode] : 1;
      const angle = baseAngle * Math.max(0, Math.min(1, ratio));
      ringFor[mode].style.setProperty('--ring-angle', `${angle}deg`);
      ringFor[mode].classList.toggle('is-active', mode === active);
      ringFor[mode].setAttribute('aria-valuenow', String(values[mode]));
      ringFor[mode].setAttribute('aria-valuetext', readable(values[mode], mode));
      modeButtons[mode].classList.toggle('is-active', mode === active);
      modeButtons[mode].setAttribute('aria-pressed', String(mode === active));
      modeButtons[mode].querySelector('b').textContent = readable(values[mode], mode);
    }
    selectedDuration.textContent = readable(pausedRemaining ?? values[active], active);
  };

  const selectMode = (mode) => {
    if (timerState().running) return;
    active = mode;
    pausedRemaining = null;
    paint();
  };

  const toggleTimer = () => {
    const timer = timerState();
    if (timer.over) {
      stopTimer();
      pausedRemaining = null;
      audio.unlock();
      startTimer(values[active], active);
    } else if (timer.running) {
      pausedRemaining = Math.max(1, timer.remaining);
      stopTimer();
    } else {
      audio.unlock();
      startTimer(pausedRemaining ?? values[active], active);
      pausedRemaining = null;
    }
    paint();
  };
  startButton.onclick = toggleTimer;
  mobileStartButton.onclick = toggleTimer;

  const adjust = (direction) => {
    if (timerState().running) return;
    values[active] = clampAndSnap(values[active] + modes[active].step * direction, modes[active]);
    pausedRemaining = null;
    paint();
  };

  const modeSelector = el(
    'div',
    { class: 'dual-timer__modes' },
    Object.entries(modes).map(([mode, config]) => {
      const button = el(
        'button',
        { type: 'button', class: `dual-timer__mode dual-timer__mode--${config.color}`, onClick: () => selectMode(mode) },
        el('i'),
        el('span', null, el('strong', null, config.label), el('small', null, config.hint)),
        el('b', { class: 'num' }),
      );
      modeButtons[mode] = button;
      return button;
    }),
  );

  const setFromPointer = (event) => {
    if (!dragging || timerState().running) return;
    const rect = dial.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const angle = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
    values[dragging] = valueForAngle(angle, modes[dragging]);
    active = dragging;
    pausedRemaining = null;
    paint();
  };

  dial.onpointerdown = (event) => {
    if (timerState().running) return;
    const rect = dial.getBoundingClientRect();
    const radius = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
    const outerDistance = Math.abs(radius - rect.width * 0.44);
    const innerDistance = Math.abs(radius - rect.width * 0.31);
    dragging = outerDistance <= innerDistance ? 'training' : 'rest';
    haptics.tap();
    dial.setPointerCapture(event.pointerId);
    setFromPointer(event);
  };
  dial.onpointermove = (event) => setFromPointer(event);
  dial.onpointerup = (event) => {
    if (dial.hasPointerCapture(event.pointerId)) dial.releasePointerCapture(event.pointerId);
    dragging = null;
  };
  dial.onpointercancel = () => { dragging = null; };

  const unsubscribe = on('rest', paint);
  paint(initial);

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Timer', heading: 'Training and rest at a touch', back: () => go('/') }),
      el(
        'main',
        { class: 'screen timer-screen' },
        workspace({
          iconName: 'timer',
          title: 'Training timer',
          body: 'Tap a ring to select training or rest. Drag its dot around the circle to set the time.',
          className: 'timer-workspace',
          content: el(
            'div',
            { class: 'dual-timer' },
            el(
              'section',
              { class: 'dual-timer__visual' },
              dial,
              el('p', { class: 'dual-timer__gesture' }, icon('info', 'w-4 h-4'), 'Touch or click a ring, then drag its dot.'),
              el('div', { class: 'dual-timer__mobile-action' }, mobileStartButton),
            ),
            el(
              'section',
              { class: 'dual-timer__controls' },
              el('div', { class: 'dual-timer__controls-head' }, el('span', { class: 'group-heading__icon' }, icon('timer', 'w-5 h-5')), el('div', null, el('h3', null, 'Choose what you are timing'), el('p', null, 'The outer green ring is training. The inner blue ring is recovery.'))),
              modeSelector,
              el('div', { class: 'dual-timer__fine-tune' }, el('button', { type: 'button', onClick: () => adjust(-1), 'aria-label': 'Reduce duration' }, icon('minus', 'w-5 h-5')), el('span', null, el('small', null, 'Selected duration'), selectedDuration), el('button', { type: 'button', onClick: () => adjust(1), 'aria-label': 'Increase duration' }, icon('plus', 'w-5 h-5'))),
              el(
                'div',
                { class: 'dual-timer__actions' },
                startButton,
                el('button', { type: 'button', class: 'btn-quiet', onClick: () => { stopTimer(); pausedRemaining = null; paint(); } }, icon('refresh', 'w-4 h-4'), 'Reset'),
              ),
              el('p', { class: 'dual-timer__persist' }, icon('check', 'w-4 h-4'), 'The active timer keeps running when you leave this page.'),
            ),
          ),
        }),
      ),
    ),
    destroy: unsubscribe,
  };
}

function clampAndSnap(value, config) {
  return Math.max(config.min, Math.min(config.max, Math.round(value / config.step) * config.step));
}

function angleFor(value, config) {
  return 12 + ((value - config.min) / (config.max - config.min)) * 348;
}

function valueForAngle(angle, config) {
  const ratio = Math.max(0, Math.min(1, (angle - 12) / 348));
  return clampAndSnap(config.min + ratio * (config.max - config.min), config);
}

function readable(seconds, mode) {
  if (mode === 'rest') return mmss(seconds);
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}
