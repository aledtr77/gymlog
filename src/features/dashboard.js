/**
 * Today is an orientation screen, not a programme editor. It explains the
 * next useful action, gives enough context to trust it, and leaves the full
 * prescription behind progressive disclosure.
 */

import { el, replace } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, stat } from '../ui/components.js';
import { state, plannedSession, prefs, setTemplate } from '../core/state.js';
import { buildSession, volume, isTimed } from '../core/training.js';
import { go } from '../core/router.js';
import { WEEKDAYS, longDate, sameDay, startOfWeek } from '../utils/date.js';
import { compact, kg } from '../utils/num.js';
import { TEMPLATES } from '../data/programs.js';
import { caloriesBurned } from '../utils/calc.js';

const setupDraft = {
  level: null,
  split: null,
  days: null,
  reviewing: false,
  selected: null,
};

export function render() {
  if (!prefs.get('onboarded')) return renderSetup();

  const { template, session: planned } = plannedSession();
  const session = buildSession(planned, state.sets);
  const today = state.sets.filter((set) => sameDay(set.at, new Date()));
  const nextLift = session.lifts.find((lift) => !lift.done) || session.lifts.at(-1);
  const firstWorkout = state.sets.length === 0;

  const heading = session.complete
    ? 'You are done for today.'
    : session.started
      ? 'Pick up where you left off.'
      : firstWorkout
        ? 'Let’s start steady.'
        : 'Ready for your next workout?';

  const guidance = session.complete
    ? 'Recover, eat normally, and come back when you feel ready. More training is not always better training.'
    : session.started
      ? `${session.setsDone} of ${session.setsTotal} sets are complete. Your next exercise is ready.`
      : firstWorkout
        ? 'We will guide you one exercise at a time. Today is about learning the movements, not testing your limits.'
        : 'This workout follows your plan and recent training. Adjust it if your recovery or form feels off today.';

  return {
    node: el(
      'div',
      null,
      appbar({
        title: 'Today',
        heading,
        sub: longDate(new Date()),
        action: el(
          'button',
          {
            type: 'button',
            class: 'lg:hidden w-11 h-11 grid place-items-center rounded-full text-ink-2 active:bg-surface-2',
            'aria-label': 'Open tools and settings',
            onClick: () => go('/more'),
          },
          icon('more', 'w-6 h-6'),
        ),
      }),
      el(
        'main',
        { class: 'screen lg:max-w-6xl' },
        el(
          'header',
          { class: 'mb-5 lg:mb-7 max-w-2xl' },
          el('h2', { class: 'text-2xl font-black tracking-tight lg:hidden' }, heading),
          el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2 lg:mt-0 lg:text-[15px]' }, guidance),
        ),
        el(
          'div',
          { class: 'lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)] lg:gap-6 lg:items-start' },
          sessionCard({ session, template, nextLift }),
          el(
            'aside',
            { class: 'mt-4 lg:mt-0 flex flex-col gap-4' },
            weekCard(today),
            coachingCard({ firstWorkout, session, nextLift }),
          ),
        ),
      ),
    ),
  };
}

function renderSetup() {
  const main = el('main', { class: 'screen setup-screen lg:max-w-6xl' });

  const paint = () => {
    replace(main, setupDraft.reviewing ? proposalStep(paint) : questionsStep(paint));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  paint();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Today', heading: 'Set up your training plan' }),
      main,
    ),
  };
}

function questionsStep(paint) {
  const ready = setupDraft.level && setupDraft.split && setupDraft.days;
  const levelOptions = [
    { value: 'beginner', label: 'Getting started', body: 'Learning or returning' },
    { value: 'intermediate', label: 'Consistent', body: 'Training for a few months' },
    { value: 'advanced', label: 'Independent', body: 'Managing my own progress' },
  ];
  const splitOptions = [
    { value: 'full-body', label: 'Full body', body: 'Everything, every session' },
    { value: 'upper-lower', label: 'Upper / lower', body: 'Alternate the two halves' },
    { value: 'ppl', label: 'Push / pull / legs', body: 'Three focused sessions' },
  ];
  const chosenSplit = splitOptions.find((option) => option.value === setupDraft.split);
  const chosenLevel = levelOptions.find((option) => option.value === setupDraft.level);

  const build = () => {
    const suggested = suggestedTemplate(setupDraft.split, setupDraft.level);
    setupDraft.selected = new Set(suggested.sessions.flatMap((session) => session.lifts.map((lift) => `${session.id}:${lift.exerciseId}`)));
    setupDraft.reviewing = true;
    paint();
  };

  return el(
    'div',
    { class: 'onboarding' },
    el(
      'header',
      { class: 'onboarding__hero lg:hidden' },
      el('h2', { class: 'onboarding__title' }, 'Set up your training plan'),
    ),
    el(
      'section',
      { class: 'onboarding__builder' },
      el(
        'div',
        { class: 'onboarding__builder-head' },
        el('div', null, el('span', { class: 'text-sm font-extrabold uppercase tracking-[.1em] text-accent' }, 'Your training rhythm'), el('h3', null, 'Shape the week you can repeat.')),
        el('span', { class: ['onboarding__status', ready && 'is-ready'] }, ready ? 'Ready' : '3 choices'),
      ),
      setupRow(
        'Where are you now?',
        'This calibrates starting volume and load.',
        el('div', { class: 'onboarding__options' }, levelOptions.map((option, index) => setupOption(option, setupDraft.level === option.value, () => { setupDraft.level = option.value; paint(); }, levelVisual(index)))),
      ),
      setupRow(
        'How should sessions flow?',
        'Pick the structure you are most likely to enjoy.',
        el('div', { class: 'onboarding__options' }, splitOptions.map((option) => setupOption(option, setupDraft.split === option.value, () => { setupDraft.split = option.value; paint(); }, splitVisual(option.value)))),
      ),
      setupRow(
        'What is realistic most weeks?',
        'Consistency beats the perfect week.',
        el('div', { class: 'onboarding__days' }, [2, 3, 4, 5].map((days) => el('button', { type: 'button', class: ['onboarding__day', setupDraft.days === days && 'is-selected'], 'aria-pressed': String(setupDraft.days === days), onClick: () => { setupDraft.days = days; paint(); } }, el('strong', null, days === 5 ? '5+' : String(days)), el('span', null, 'days')))),
      ),
      el(
        'footer',
        { class: ['onboarding__action', ready && 'is-ready'] },
        el(
          'div',
          { class: 'onboarding__summary' },
          el('span', { class: 'onboarding__summary-icon' }, ready ? icon('check', 'w-5 h-5') : icon('info', 'w-5 h-5')),
          el('div', null, el('strong', null, ready ? `${chosenSplit.label} · ${setupDraft.days} days` : 'Your plan preview will appear here'), el('span', null, ready ? `${chosenLevel.label} starting volume, adjusted to your week.` : 'Select one option in each row.')),
        ),
        el('button', { type: 'button', class: 'btn-primary onboarding__cta', disabled: !ready, onClick: build }, 'Show my plan', icon('next', 'w-5 h-5')),
      ),
      el('button', { type: 'button', class: 'onboarding__explore', onClick: () => go('/exercises') }, 'Not ready to choose?', el('strong', null, 'Explore the exercise library'), icon('next', 'w-4 h-4')),
    ),
  );
}

function setupRow(title, hint, content) {
  return el('div', { class: 'onboarding__row' }, el('div', { class: 'onboarding__row-copy' }, el('h4', null, title), el('p', null, hint)), content);
}

function setupOption(option, active, onClick, visual) {
  return el(
    'button',
    { type: 'button', class: ['onboarding__option', active && 'is-selected'], 'aria-pressed': String(active), onClick },
    visual,
    el('span', { class: 'onboarding__option-copy' }, el('strong', null, option.label), el('small', null, option.body)),
    el('span', { class: 'onboarding__radio', 'aria-hidden': 'true' }),
  );
}

function levelVisual(index) {
  return el('span', { class: 'onboarding__level', 'aria-hidden': 'true' }, [0, 1, 2].map((bar) => el('i', { class: bar <= index ? 'is-on' : '' })));
}

function splitVisual(type) {
  return el('span', { class: `onboarding__split onboarding__split--${type}`, 'aria-hidden': 'true' }, el('i'), el('i'), el('i'));
}

function proposalStep(paint) {
  const suggested = suggestedTemplate(setupDraft.split, setupDraft.level);
  const selected = setupDraft.selected;
  const countFor = (session) => session.lifts.filter((lift) => selected.has(`${session.id}:${lift.exerciseId}`)).length;
  const valid = suggested.sessions.every((session) => countFor(session) >= 3);

  return el(
    'div',
    { class: 'setup-flow' },
    el('button', { type: 'button', class: 'btn-quiet -ml-3 mb-2', onClick: () => { setupDraft.reviewing = false; paint(); } }, icon('back', 'w-5 h-5'), 'Change answers'),
    el(
      'header',
      { class: 'max-w-2xl mb-6' },
      el('p', { class: 'setup-eyebrow' }, 'Review before you start'),
      el('h2', { class: 'mt-2 text-3xl font-black tracking-tight' }, suggested.name),
      el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2' }, proposalExplanation(setupDraft.level, setupDraft.days, suggested)),
    ),
    el(
      'div',
      { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start' },
      suggested.sessions.map((session, sessionIndex) =>
        el(
          'section',
          { class: 'card' },
          el('p', { class: 'label' }, `Session ${sessionIndex + 1}`),
          el('h3', { class: 'mt-1 text-xl font-black' }, session.name),
          el('p', { class: 'mt-1 text-sm text-ink-2' }, session.focus),
          el('p', { class: 'mt-3 text-[13px] leading-relaxed text-ink-3' }, 'Everything is selected to start. Remove anything you do not want, keeping at least three exercises per session.'),
          el(
            'div',
            { class: 'mt-3 border-t border-line' },
            session.lifts.map((lift) => {
              const key = `${session.id}:${lift.exerciseId}`;
              const checked = selected.has(key);
              return el(
                'label',
                { class: 'flex items-center gap-3 min-h-[58px] py-2.5 border-b border-line last:border-0 cursor-pointer' },
                el('input', { type: 'checkbox', class: 'w-5 h-5 accent-current shrink-0', checked, onChange: () => { checked ? selected.delete(key) : selected.add(key); paint(); } }),
                el('span', { class: 'flex-1 min-w-0' }, el('span', { class: 'block font-bold' }, lift.name), el('span', { class: 'block text-xs text-ink-3 num' }, `${lift.sets} sets · ${isTimed(lift.exerciseId) ? `${lift.reps} seconds` : `${lift.reps} reps`}`)),
              );
            }),
          ),
        ),
      ),
    ),
    !valid ? el('p', { class: 'mt-4 text-sm font-bold text-warn' }, 'Keep at least three exercises in every session.') : null,
    el(
      'div',
      { class: 'mt-5 rounded-xl3 border border-line bg-surface p-5 flex flex-col sm:flex-row sm:items-center gap-4' },
      el('div', { class: 'flex-1' }, el('h3', { class: 'font-extrabold' }, 'Happy with this starting point?'), el('p', { class: 'mt-1 text-[13px] leading-relaxed text-ink-3' }, 'Once confirmed, Today will show your next session. You can revisit this setup at any time.')),
      el('button', { type: 'button', class: 'btn-primary sm:min-w-[210px]', disabled: !valid, onClick: () => activateProposal(suggested) }, 'Use this plan'),
    ),
    el('button', { type: 'button', class: 'btn-quiet mt-3', onClick: () => go('/exercises') }, 'I want to learn about these exercises', icon('next', 'w-4 h-4')),
  );
}

function suggestedTemplate(split, level) {
  const base = TEMPLATES.find((template) => template.id === split) || TEMPLATES[0];
  const ranks = { beginner: 0, intermediate: 1, advanced: 2 };
  const delta = (ranks[level] ?? 0) - (ranks[base.level] ?? 0);

  return {
    ...base,
    level,
    sessions: base.sessions.map((session) => ({
      ...session,
      lifts: session.lifts.map((lift) => ({
        ...lift,
        sets: Math.max(2, Math.min(5, lift.sets + delta)),
        start: lift.start
          ? Math.max(2.5, Math.round((lift.start * (1 + delta * 0.2)) / 2.5) * 2.5)
          : 0,
      })),
    })),
  };
}

function proposalExplanation(level, days, template) {
  const levelLabel = level === 'beginner' ? 'getting started' : level === 'intermediate' ? 'consistent' : 'independent';
  const recommended = recommendedDays(level, days);
  const availability = days === 5 ? '5 or more' : days;
  const adjustment = recommended < days ? ` We suggest starting with ${recommended} so recovery stays manageable.` : '';
  return `You chose the ${template.name} structure, a ${levelLabel} starting level, and ${availability} available days.${adjustment} The plan rotates through ${template.sessions.length} sessions. Review every exercise before you confirm.`;
}

function recommendedDays(level, available) {
  if (level === 'beginner') return Math.min(available, 3);
  if (level === 'intermediate') return Math.min(available, 4);
  return available;
}

function activateProposal(base) {
  const sessions = base.sessions.map((session) => ({
    ...session,
    lifts: session.lifts.filter((lift) => setupDraft.selected.has(`${session.id}:${lift.exerciseId}`)),
  }));
  const custom = {
    ...base,
    id: 'custom',
    name: 'My plan',
    days: recommendedDays(setupDraft.level, setupDraft.days),
    level: setupDraft.level,
    blurb: `${recommendedDays(setupDraft.level, setupDraft.days)} days per week, set up by you.`,
    bestFor: 'A starting plan shaped by your setup choices.',
    schedule: `${recommendedDays(setupDraft.level, setupDraft.days)} days per week with recovery between sessions.`,
    sessions,
  };
  const level = setupDraft.level;
  const trainingDays = recommendedDays(level, setupDraft.days);
  const split = setupDraft.split;
  setupDraft.level = null;
  setupDraft.split = null;
  setupDraft.days = null;
  setupDraft.reviewing = false;
  setupDraft.selected = null;
  setTemplate('custom', { level, split, trainingDays, customTemplate: custom });
}

function sessionCard({ session, template, nextLift }) {
  const completedPct = session.setsTotal ? Math.round((session.setsDone / session.setsTotal) * 100) : 0;
  const minutes = Math.max(30, Math.round(session.setsTotal * 2.7 / 5) * 5);
  const profileWeight = state.body[0]?.weight || prefs.get('profile')?.weight;
  const estimatedCalories = caloriesBurned(profileWeight, minutes, 5);

  return el(
    'section',
    {
      class: 'rounded-xl3 border border-line p-5 lg:p-7 relative overflow-hidden',
      style: {
        backgroundImage:
          'linear-gradient(145deg, rgb(var(--accent) / 0.11), transparent 48%), linear-gradient(rgb(var(--surface)), rgb(var(--surface)))',
      },
    },
    el(
      'div',
      { class: 'flex items-start gap-4' },
      el(
        'div',
        { class: 'flex-1 min-w-0' },
        el('p', { class: 'label text-accent' }, session.complete ? 'Complete' : session.started ? 'In progress' : 'Your next workout'),
        el('h3', { class: 'mt-1 text-2xl lg:text-3xl font-black tracking-tight' }, session.name),
        el('p', { class: 'mt-1 text-sm text-ink-2' }, session.focus),
      ),
      session.started
        ? el('span', { class: 'chip chip-on shrink-0 num' }, `${completedPct}%`)
        : null,
    ),
    el(
      'div',
      { class: 'flex flex-wrap gap-2 mt-4' },
      el('span', { class: 'chip' }, `${session.lifts.length} exercises`),
      el('span', { class: 'chip' }, `${session.setsTotal} sets`),
      el('span', { class: 'chip' }, `about ${minutes} min`),
      estimatedCalories ? el('span', { class: 'chip' }, `about ${estimatedCalories} kcal`) : null,
    ),
    session.started
      ? el(
          'div',
          { class: 'mt-5 h-2 rounded-full bg-surface-2 overflow-hidden', role: 'progressbar', 'aria-label': 'Workout completed', 'aria-valuenow': String(completedPct), 'aria-valuemin': '0', 'aria-valuemax': '100' },
          el('div', { class: 'h-full rounded-full bg-accent', style: { width: `${completedPct}%` } }),
        )
      : null,
    !session.complete && nextLift
      ? el(
          'div',
          { class: 'mt-5 rounded-2xl border border-line bg-bg/45 p-4' },
          el('p', { class: 'label' }, session.started ? 'Next exercise' : 'Start here'),
          el('p', { class: 'mt-1 font-extrabold' }, nextLift.name),
          el('p', { class: 'mt-0.5 text-sm text-ink-2 num' }, targetLabel(nextLift)),
          el('p', { class: 'mt-2 text-xs leading-relaxed text-ink-3' }, nextLift.target.why),
        )
      : null,
    el(
      'details',
      { class: 'group mt-4' },
      el(
        'summary',
        { class: 'min-h-[44px] flex items-center gap-2 cursor-pointer text-sm font-bold text-ink-2 select-none' },
        icon('next', 'w-4 h-4 transition group-open:rotate-90'),
        'View all exercises',
      ),
      el(
        'ol',
        { class: 'border-t border-line/70' },
        session.lifts.map((lift, index) =>
          el(
            'li',
            { class: 'flex items-center gap-3 py-3 border-b border-line/70 last:border-0' },
            el('span', { class: ['w-6 h-6 shrink-0 grid place-items-center rounded-full text-xs font-black', lift.done ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-3'] }, lift.done ? '✓' : String(index + 1)),
            el('span', { class: 'flex-1 min-w-0' }, el('span', { class: 'block font-bold truncate' }, lift.name), el('span', { class: 'block text-xs text-ink-3 num' }, targetLabel(lift))),
          ),
        ),
      ),
    ),
    el(
      'div',
      { class: 'mt-5 flex flex-col sm:flex-row gap-2.5' },
      el(
        'button',
        { type: 'button', class: 'btn-primary sm:min-w-[220px]', disabled: session.complete, onClick: () => go('/session') },
        session.complete ? 'Workout complete' : session.started ? 'Resume workout' : 'Start workout',
        session.complete ? null : icon('next', 'w-5 h-5'),
      ),
      el('button', { type: 'button', class: 'btn-quiet', onClick: () => go('/more') }, `Plan: ${template.name}`),
    ),
  );
}

function weekCard(todaySets) {
  const weekStart = startOfWeek(new Date());
  const sessionsThisWeek = new Set(
    state.sets
      .filter((set) => new Date(set.at) >= weekStart)
      .map((set) => new Date(set.at).toDateString()),
  ).size;

  return el(
    'section',
    { class: 'card' },
    el('div', { class: 'flex items-baseline justify-between gap-3' }, el('h3', { class: 'font-extrabold' }, 'This week'), el('span', { class: 'text-xs text-ink-3' }, 'Mon–Sun')),
    weekStrip(),
    el(
      'div',
      { class: 'grid grid-cols-3 gap-3 pt-4 border-t border-line' },
      stat(String(todaySets.length), 'sets today', { accent: todaySets.length > 0 }),
      stat(compact(volume(todaySets)), 'kg today'),
      stat(String(sessionsThisWeek), 'sessions / 7d'),
    ),
  );
}

function coachingCard({ firstWorkout, session, nextLift }) {
  const title = firstWorkout ? 'Your first workout' : session.complete ? 'After training' : 'Today’s approach';
  const body = firstWorkout
    ? 'Choose a load that leaves another 3–4 good reps in reserve. Open the exercise library if a movement is unfamiliar.'
    : session.complete
      ? 'There is no need to add extra work. Progress comes from consistent sessions performed with steady form.'
      : nextLift?.target.status === 'up'
        ? 'The load increases because you completed every set last time. Reduce it if your form breaks down today.'
        : 'Keep the same load until you can complete every planned set with controlled form.';

  return el(
    'section',
    { class: 'card' },
    el('div', { class: 'w-9 h-9 grid place-items-center rounded-xl bg-accent/12 text-accent' }, icon('info', 'w-5 h-5')),
    el('h3', { class: 'mt-3 font-extrabold' }, title),
    el('p', { class: 'mt-1.5 text-sm leading-relaxed text-ink-2' }, body),
    firstWorkout
      ? el('button', { type: 'button', class: 'btn-quiet mt-2 -ml-3', onClick: () => go('/exercises') }, 'Open exercise library', icon('next', 'w-4 h-4'))
      : null,
  );
}

function targetLabel(lift) {
  if (isTimed(lift.exerciseId)) return `${lift.sets} sets of ${lift.target.reps} seconds`;
  return `${lift.sets} × ${lift.target.reps}${lift.target.weight ? ` · ${kg(lift.target.weight)} kg` : ' · bodyweight'}`;
}

function weekStrip() {
  const start = startOfWeek(new Date());
  const today = new Date();

  return el(
    'div',
    { class: 'flex gap-1.5 my-4', role: 'list', 'aria-label': 'Workouts this week' },
    WEEKDAYS.map((letter, index) => {
      const day = new Date(start);
      day.setDate(day.getDate() + index);
      const trained = state.sets.some((set) => sameDay(set.at, day));
      const isToday = sameDay(day, today);
      return el(
        'span',
        { role: 'listitem', class: ['flex-1 h-9 grid place-items-center rounded-lg text-[11px] font-extrabold', trained ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-3', isToday && !trained && 'ring-1 ring-accent/60'], 'aria-label': `${letter}: ${trained ? 'workout logged' : isToday ? 'today' : 'no workout'}` },
        letter,
      );
    }),
  );
}
