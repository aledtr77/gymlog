/** Choose, review, change, or reset the active training plan. */

import { el, replace } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar } from '../ui/components.js';
import { activeTemplate, prefs, resetTemplate, setTemplate } from '../core/state.js';
import { isTimed } from '../core/training.js';
import { go } from '../core/router.js';
import { TEMPLATES } from '../data/programs.js';

const setupDraft = {
  level: null,
  split: null,
  days: null,
  reviewing: false,
  selected: null,
  resetting: false,
  saved: false,
};

export function render() {
  return renderSetup();
}

function renderSetup() {
  const main = el('main', { class: 'screen setup-screen' });

  const paint = () => {
    replace(main, setupDraft.reviewing ? proposalStep(paint) : questionsStep(paint));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  paint();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Training', heading: 'Choose your training' }),
      main,
    ),
  };
}

function questionsStep(paint) {
  const ready = setupDraft.level && setupDraft.split && setupDraft.days;
  const current = prefs.get('template') ? activeTemplate() : null;
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
    setupDraft.saved = false;
    paint();
  };

  return el(
    'div',
    { class: 'onboarding' },
    current
      ? el(
          'section',
          { class: 'mb-4 rounded-2xl border border-accent/25 bg-accent/10 p-5' },
          el(
            'div',
            { class: 'flex flex-col gap-4 sm:flex-row sm:items-center' },
            el(
              'div',
              { class: 'min-w-0 flex-1' },
              el(
                'div',
                { class: 'flex flex-wrap items-center gap-2' },
                el('p', { class: 'label text-accent' }, 'Current training'),
                el('span', { class: 'inline-flex items-center gap-1.5 rounded-full bg-ok/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-ok' }, el('i', { class: 'h-2 w-2 rounded-full bg-ok shadow-[0_0_10px_rgb(var(--ok)/.7)]', 'aria-hidden': 'true' }), 'Active'),
              ),
              el('h2', { class: 'mt-1 text-xl font-black' }, current.name),
              el('p', { class: 'mt-1 text-sm text-ink-2' }, `${current.days} days per week · Choose new answers below to change it.`),
            ),
            !setupDraft.resetting
              ? el(
                  'div',
                  { class: 'flex shrink-0 flex-wrap gap-2' },
                  el('button', { type: 'button', class: 'btn bg-accent text-accent-ink', onClick: () => { setupDraft.saved = false; paint(); requestAnimationFrame(() => document.getElementById('training-builder')?.scrollIntoView({ behavior: 'smooth' })); } }, icon('refresh', 'w-5 h-5'), 'Change training'),
                  el('button', { type: 'button', class: 'btn-quiet text-danger', onClick: () => { setupDraft.resetting = true; setupDraft.saved = false; paint(); } }, icon('trash', 'w-5 h-5'), 'Reset'),
                )
              : null,
          ),
          setupDraft.resetting
            ? el(
                'div',
                { class: 'mt-5 rounded-xl border border-danger/35 bg-danger/10 p-4', role: 'group', 'aria-label': 'Confirm training reset' },
                el('div', { class: 'flex items-start gap-3' },
                  el('span', { class: 'mt-0.5 shrink-0 text-danger', 'aria-hidden': 'true' }, icon('trash', 'w-5 h-5')),
                  el('div', { class: 'min-w-0' },
                    el('h3', { class: 'font-black text-ink' }, 'Reset this training?'),
                    el('p', { class: 'mt-1 text-sm leading-relaxed text-ink-2' }, 'This removes the active plan and weekly target. Your workout history and progress will stay available.'),
                  ),
                ),
                el('div', { class: 'mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end' },
                  el('button', { type: 'button', class: 'btn bg-surface-2 text-ink', onClick: () => { setupDraft.resetting = false; paint(); } }, 'Cancel'),
                  el('button', {
                    type: 'button',
                    class: 'btn bg-danger text-white',
                    onClick: () => {
                      setupDraft.level = null;
                      setupDraft.split = null;
                      setupDraft.days = null;
                      setupDraft.reviewing = false;
                      setupDraft.selected = null;
                      setupDraft.resetting = false;
                      setupDraft.saved = false;
                      resetTemplate();
                      paint();
                    },
                  }, icon('trash', 'w-5 h-5'), 'Reset training'),
                ),
              )
            : null,
          setupDraft.saved
            ? el(
                'div',
                { class: 'mt-5 flex items-start gap-3 rounded-xl border border-ok/35 bg-ok/10 p-4', role: 'status', 'aria-live': 'polite' },
                el('span', { class: 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ok/15 text-ok', 'aria-hidden': 'true' }, icon('check', 'w-5 h-5')),
                el('div', { class: 'min-w-0' }, el('h3', { class: 'font-black text-ink' }, 'Training saved'), el('p', { class: 'mt-1 text-sm leading-relaxed text-ink-2' }, 'This plan is now active. You can keep reviewing it here or choose another section when you are ready.')),
              )
            : null,
        )
      : null,
    el(
      'header',
      { class: 'onboarding__hero lg:hidden' },
      el('h2', { class: 'onboarding__title' }, 'Set up your training plan'),
    ),
    el(
      'section',
      { id: 'training-builder', class: 'onboarding__builder' },
      el(
        'div',
        { class: 'onboarding__builder-head' },
        el('div', null, el('span', { class: 'text-sm font-extrabold uppercase tracking-[.1em] text-accent' }, 'Your training rhythm'), el('h3', null, 'Shape the week you can repeat.')),
        el('span', { class: ['onboarding__status', ready && 'is-ready'] }, ready ? 'Ready' : '3 choices'),
      ),
      setupRow(
        'Where are you now?',
        'This calibrates starting volume and load.',
        el('div', { class: 'onboarding__options' }, levelOptions.map((option, index) => setupOption(option, setupDraft.level === option.value, () => { setupDraft.level = option.value; setupDraft.saved = false; paint(); }, levelVisual(index)))),
      ),
      setupRow(
        'How should sessions flow?',
        'Pick the structure you are most likely to enjoy.',
        el('div', { class: 'onboarding__options' }, splitOptions.map((option) => setupOption(option, setupDraft.split === option.value, () => { setupDraft.split = option.value; setupDraft.saved = false; paint(); }, splitVisual(option.value)))),
      ),
      setupRow(
        'What is realistic most weeks?',
        'Consistency beats the perfect week.',
        el('div', { class: 'onboarding__days' }, [2, 3, 4, 5].map((days) => el('button', { type: 'button', class: ['onboarding__day', setupDraft.days === days && 'is-selected'], 'aria-pressed': String(setupDraft.days === days), onClick: () => { setupDraft.days = days; setupDraft.saved = false; paint(); } }, el('strong', null, days === 5 ? '5+' : String(days)), el('span', null, 'days')))),
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
  setupDraft.resetting = false;
  setupDraft.saved = true;
  setTemplate('custom', { level, split, trainingDays, customTemplate: custom });
}
