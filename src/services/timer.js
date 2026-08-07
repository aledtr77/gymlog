/** Timer service shared by the timer screen, workouts, and persistent bar. */
import { el } from '../ui/el.js';
import { emit, on } from '../core/bus.js';
import { audio, haptics, notify } from '../platform/index.js';
import * as prefs from './prefs.js';
import { currentPath } from '../core/router.js';
import { mmss } from '../utils/date.js';

let endsAt = 0;
let total = 0;
let ticker = null;
let fired = false;
let timerKind = 'rest';

export function timerState() {
  if (!endsAt) return { running: false, remaining: 0, total: 0, over: false, kind: timerKind };
  const ms = endsAt - Date.now();
  return {
    running: true,
    remaining: Math.max(0, Math.round(ms / 1000)),
    total,
    over: ms <= 0,
    kind: timerKind,
  };
}

export function startTimer(seconds, kind = 'rest') {
  stopTimer();
  total = seconds;
  timerKind = kind;
  endsAt = Date.now() + seconds * 1000;
  fired = false;

  ticker = setInterval(() => {
    if (endsAt - Date.now() <= 0 && !fired) {
      fired = true;
      if (prefs.get('sound')) audio.beep();
      if (prefs.get('vibration')) haptics.alarm();
      notify.show(kind === 'training' ? 'Training timer complete' : 'Rest complete', kind === 'training' ? 'Your training block has ended.' : 'You are ready for the next set.');
      emit('rest', timerState());
      setTimeout(stopTimer, 6000);
      return;
    }
    emit('rest', timerState());
  }, 250);

  emit('rest', timerState());
}

export function startRest(seconds = prefs.get('restDefault')) {
  startTimer(seconds, 'rest');
}

export function addTime(seconds) {
  if (!endsAt) return;
  endsAt += seconds * 1000;
  total += seconds;
  fired = false;
  emit('rest', timerState());
}

export function stopTimer() {
  clearInterval(ticker);
  ticker = null;
  endsAt = 0;
  total = 0;
  fired = false;
  emit('rest', timerState());
}

export function mountTimerBar(root) {
  const host = el('div');
  root.appendChild(host);

  on('rest', (timer) => {
    if (!timer.running || currentPath() === '/timer') {
      host.replaceChildren();
      return;
    }

    const left = timer.total ? Math.max(0, timer.remaining / timer.total) : 0;
    const training = timer.kind === 'training';

    host.replaceChildren(
      el(
        'div',
        {
          class: [
            'fixed left-3 right-3 z-40 mx-auto max-w-lg flex items-stretch rounded-2xl overflow-hidden shadow-2xl transition-colors',
            timer.over ? 'bg-accent text-accent-ink' : 'bg-surface-3',
          ],
          style: { bottom: 'calc(112px + env(safe-area-inset-bottom, 0px))' },
          role: 'timer',
          'aria-live': 'off',
        },
        el(
          'button',
          { type: 'button', class: 'flex-1 min-w-0 flex items-center justify-between gap-3 px-5 py-4 text-left', 'aria-label': `Stop ${timer.kind} timer`, onClick: stopTimer },
          el('span', { class: 'label' }, timer.over ? 'Done' : training ? 'Training' : 'Rest'),
          el('span', { class: 'text-2xl font-black num' }, mmss(timer.remaining)),
          el('span', { class: 'absolute left-0 bottom-0 h-[3px] bg-accent origin-left', style: { width: '100%', transform: `scaleX(${left.toFixed(3)})` } }),
        ),
        el('button', { type: 'button', class: 'px-5 font-extrabold border-l border-black/20', onClick: () => addTime(training ? 60 : 30) }, training ? '+1 min' : '+30 sec'),
      ),
    );
  });
}
