/** Daily and weekly training cadence. Plan selection lives in /training. */
import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, stat } from '../ui/components.js';
import {
  clearTrainingDay,
  plannedSession,
  prefs,
  setTrainingDay,
  state,
} from '../core/state.js';
import { go } from '../core/router.js';
import { WEEKDAYS, longDate, sameDay, startOfWeek } from '../utils/date.js';

const DAY_MS = 86400000;

export function render() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const target = Number(prefs.get('trainingDays')) || 3;
  const completed = completedKeys();
  const todayKey = dateKey(now);
  const todayRecord = trainingRecord(now);
  const todayComplete = completed.has(todayKey);
  const completedThisWeek = days.filter((day) => completed.has(dateKey(day))).length;
  const todayIndex = (now.getDay() + 6) % 7;
  const weekState = weeklyCadenceStatus(completedThisWeek, target, todayIndex, todayComplete);

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Today', heading: longDate(now) }),
      el(
        'main',
        { class: 'screen today-screen' },
        el(
          'div',
          { class: 'grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]' },
          el(
            'section',
            { class: 'workspace' },
            el(
              'header',
              { class: 'workspace__head' },
              el('span', { class: 'workspace__icon', 'aria-hidden': 'true' }, icon('calendar', 'w-6 h-6')),
              el(
                'div',
                { class: 'min-w-0 flex-1' },
                el('p', { class: 'label text-accent' }, 'This week'),
                el('h2', { class: 'workspace__title mt-1' }, weekState.label),
                el('p', { class: 'workspace__copy' }, weekState.body),
              ),
              el('span', { class: ['chip shrink-0', weekState.tone === 'ok' && 'chip-on', weekState.tone === 'danger' && 'text-danger'] }, `${completedThisWeek}/${target}`),
            ),
            el(
              'div',
              { class: 'workspace__body' },
              el(
                'div',
                { class: 'grid grid-cols-7 gap-2', role: 'list', 'aria-label': 'Training cadence this week' },
                days.map((day, index) => dayCell(day, WEEKDAYS[index], completed, now)),
              ),
              el(
                'div',
                { class: 'mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5' },
                stat(String(completedThisWeek), 'completed', { accent: completedThisWeek > 0 }),
                stat(String(target), 'weekly goal'),
                stat(String(Math.max(0, target - completedThisWeek)), 'remaining'),
              ),
              previousWeekSummary(now, completed, target),
            ),
          ),
          todayCard({ now, todayComplete, todayRecord }),
        ),
      ),
    ),
  };
}

export function weeklyCadenceStatus(completed, target, todayIndex, todayComplete = false) {
  const daysAvailable = Math.max(0, 7 - todayIndex - (todayComplete ? 1 : 0));
  const stillNeeded = Math.max(0, target - completed);

  if (completed >= target) {
    return { label: 'Goal met', tone: 'ok', body: `${completed} of ${target} training days completed.` };
  }
  if (stillNeeded > daysAvailable) {
    return { label: 'Goal missed', tone: 'danger', body: `${completed} of ${target} completed, with too few days left this week.` };
  }
  return {
    label: 'On track',
    tone: 'accent',
    body: `${stillNeeded} ${stillNeeded === 1 ? 'session' : 'sessions'} left across ${daysAvailable} available ${daysAvailable === 1 ? 'day' : 'days'}.`,
  };
}

function todayCard({ now, todayComplete, todayRecord }) {
  const hasPlan = Boolean(prefs.get('template'));
  const planned = hasPlan ? plannedSession(now) : null;
  const status = todayComplete ? 'Trained today' : todayRecord?.status === 'planned' ? 'Planned today' : 'No training marked';

  return el(
    'section',
    { class: 'surface-group p-5 sm:p-6' },
    el('div', { class: 'flex items-start justify-between gap-3' },
      el('div', null, el('p', { class: 'label text-accent' }, 'Today'), el('h2', { class: 'mt-1 text-2xl font-black' }, status)),
      el('span', { class: ['grid h-11 w-11 place-items-center rounded-xl', todayComplete ? 'bg-ok/15 text-ok' : 'bg-surface-2 text-ink-3'] }, icon(todayComplete ? 'check' : 'calendar', 'w-6 h-6')),
    ),
    el(
      'p',
      { class: 'mt-3 text-sm leading-relaxed text-ink-2' },
      todayComplete
        ? 'This day counts toward your weekly goal.'
        : todayRecord?.status === 'planned'
          ? 'Training is on the calendar. Mark it complete when you are done.'
          : 'Decide whether today is a training day. You can change it later.',
    ),
    hasPlan
      ? el(
          'div',
          { class: 'mt-5 rounded-2xl border border-line bg-bg/35 p-4' },
          el('p', { class: 'label' }, 'Current training'),
          el('strong', { class: 'mt-1 block text-lg' }, planned.session.name),
          el('span', { class: 'mt-1 block text-xs text-ink-3' }, planned.session.focus),
          el('button', { type: 'button', class: 'btn-primary mt-4 w-full', onClick: () => go('/session') }, icon('play', 'w-5 h-5'), 'Start training'),
        )
      : el(
          'button',
          { type: 'button', class: 'btn-primary mt-5 w-full', onClick: () => go('/training') },
          icon('dumbbell', 'w-5 h-5'),
          'Choose your training',
        ),
    el(
      'div',
      { class: 'mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1' },
      !todayComplete && todayRecord?.status !== 'planned'
        ? el('button', { type: 'button', class: 'btn bg-surface-2 text-ink', onClick: () => setTrainingDay(now, 'planned') }, icon('calendar', 'w-5 h-5'), 'Plan today')
        : null,
      !todayComplete
        ? el('button', { type: 'button', class: 'btn bg-accent/10 text-accent', onClick: () => setTrainingDay(now, 'complete') }, icon('check', 'w-5 h-5'), 'Mark as trained')
        : null,
      todayRecord && !hasLoggedSets(now)
        ? el('button', { type: 'button', class: 'btn-quiet', onClick: () => clearTrainingDay(now) }, 'Clear today status')
        : null,
    ),
  );
}

function dayCell(day, label, completed, now) {
  const key = dateKey(day);
  const complete = completed.has(key);
  const record = trainingRecord(day);
  const isToday = sameDay(day, now);
  const isPast = day < new Date(new Date(now).setHours(0, 0, 0, 0));
  const status = complete ? 'complete' : record?.status === 'planned' ? 'planned' : isPast ? 'missed' : 'open';

  return el(
    'div',
    {
      role: 'listitem',
      class: [
        'flex min-h-[92px] flex-col items-center justify-center rounded-xl border text-center',
        complete && 'border-ok/40 bg-ok/10 text-ok',
        status === 'planned' && 'border-accent/40 bg-accent/10 text-accent',
        status === 'missed' && 'border-danger/20 bg-danger/5 text-danger',
        status === 'open' && 'border-line bg-surface-2 text-ink-3',
        isToday && 'ring-2 ring-accent/50',
      ],
      'aria-label': `${label}: ${status}`,
    },
    el('strong', { class: 'text-sm' }, label),
    el('span', { class: 'mt-2 grid h-7 w-7 place-items-center rounded-full bg-bg/30' }, complete ? icon('check', 'w-4 h-4') : status === 'planned' ? icon('calendar', 'w-4 h-4') : status === 'missed' ? '×' : '·'),
    el('small', { class: 'mt-1 text-[9px] font-extrabold uppercase tracking-wide' }, isToday ? 'today' : status),
  );
}

function previousWeekSummary(now, completed, target) {
  const currentStart = startOfWeek(now);
  const previousStart = new Date(currentStart.getTime() - 7 * DAY_MS);
  const previousDays = Array.from({ length: 7 }, (_, index) => new Date(previousStart.getTime() + index * DAY_MS));
  const count = previousDays.filter((day) => completed.has(dateKey(day))).length;
  const met = count >= target;

  return el(
    'div',
    { class: 'mt-5 flex items-center gap-3 rounded-xl border border-line bg-bg/25 p-4' },
    el('span', { class: ['grid h-9 w-9 shrink-0 place-items-center rounded-xl', met ? 'bg-ok/15 text-ok' : 'bg-danger/10 text-danger'] }, icon(met ? 'check' : 'close', 'w-5 h-5')),
    el('div', { class: 'min-w-0 flex-1' }, el('strong', { class: 'block text-sm' }, met ? 'Last week: goal met' : 'Last week: goal missed'), el('span', { class: 'mt-0.5 block text-xs text-ink-3' }, `${count} of ${target} training days completed.`)),
  );
}

function completedKeys() {
  const keys = new Set(state.sets.map((entry) => dateKey(entry.at)));
  state.goals
    .filter((goal) => goal.type === 'training-day' && goal.status === 'complete')
    .forEach((goal) => keys.add(goal.date));
  return keys;
}

function trainingRecord(date) {
  const id = `training-day:${dateKey(date)}`;
  return state.goals.find((goal) => goal.id === id) || null;
}

function hasLoggedSets(date) {
  return state.sets.some((entry) => sameDay(entry.at, date));
}

function dateKey(value) {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}
