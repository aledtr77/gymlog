/**
 * Exercise library: instant search, body-area navigation, and technique
 * guidance for each movement. Search runs over a precomputed normalised string so typing
 * stays smooth on the full library without debouncing.
 */
import { el, replace } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, blank } from '../ui/components.js';
import { EXERCISES, normalize } from '../data/exercises.js';
import { coachingFor, hasCoaching } from '../data/coaching.js';
import { state } from '../core/state.js';
import { go } from '../core/router.js';
import { personalBests } from '../core/training.js';
import { kg } from '../utils/num.js';

// Search and area survive route redraws, so returning from another screen does
// not throw the user back to the beginning of the library.
const AREAS = [
  { id: 'upper', label: 'Upper body', short: 'Chest, back and arms', icon: 'dumbbell', muscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms'] },
  { id: 'lower', label: 'Lower body', short: 'Legs and glutes', icon: 'chart', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  { id: 'core', label: 'Core & full body', short: 'Trunk and whole body', icon: 'target', muscles: ['Core', 'Total body'] },
  { id: 'cardio', label: 'Cardio', short: 'Conditioning', icon: 'timer', muscles: ['Cardio'] },
];

const libraryView = { query: '', area: 'upper' };

export function render() {
  const list = el('div', { class: 'exercise-groups' });
  const count = el('span', { class: 'exercise-pane__count' });
  const paneTitle = el('h2');
  const paneBody = el('p');
  const paneIcon = el('span', { class: 'settings-pane__icon' });
  const headerAction = el('div', { class: 'exercise-pane__action' }, count);
  const paneContent = el('div', { class: 'settings-pane__body exercise-pane__body' });
  const bests = new Map(personalBests(state.sets).map((b) => [b.exerciseId, b]));
  const categoryButtons = new Map();

  const search = el('input', {
    type: 'search',
    class: 'field pl-11',
    placeholder: 'Search by name or equipment…',
    'aria-label': 'Search exercises',
    autocomplete: 'off',
    value: libraryView.query,
    onInput: (event) => {
      libraryView.query = event.target.value;
      paint();
    },
  });

  const tools = el(
    'div',
    { class: 'exercise-tools' },
    el(
      'div',
      { class: 'relative min-w-0 flex-1' },
      el('span', { class: 'absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none' }, icon('search', 'w-5 h-5')),
      search,
    ),
    el('p', null, 'Choose an exercise to read its setup and coaching cues.'),
  );

  function selectArea(id) {
    libraryView.area = id;
    for (const [key, button] of categoryButtons) {
      const selected = key === id;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    paint();
  }

  function paint() {
    const area = AREAS.find((item) => item.id === libraryView.area) || AREAS[0];
    const needle = normalize(libraryView.query.trim());
    const found = EXERCISES.filter((ex) => {
      if (!area.muscles.includes(ex.muscle)) return false;
      if (needle && !ex.search.includes(needle)) return false;
      return true;
    });

    replace(paneContent, tools, list);
    replace(headerAction, count);
    paneIcon.replaceChildren(icon(area.icon, 'w-6 h-6'));
    paneTitle.textContent = area.label;
    paneBody.textContent = area.short;
    const countText = `${found.length} ${found.length === 1 ? 'exercise' : 'exercises'}`;
    count.textContent = countText;

    if (!found.length) {
      replace(list, blank({ title: 'No results', body: 'Try another name or adjust the filters.' }));
      return;
    }

    const groups = area.muscles
      .map((muscle) => [muscle, found.filter((exercise) => exercise.muscle === muscle)])
      .filter(([, exercises]) => exercises.length);

    replace(list, groups.map(([muscle, exercises]) => exerciseGroup(muscle, exercises)));
  }

  function exerciseGroup(muscle, exercises) {
    return el(
      'section',
      { class: 'exercise-group' },
      el(
        'header',
        { class: 'exercise-group__head' },
        el('div', null, el('h3', null, muscle), el('p', null, muscleDescription(muscle))),
        el('span', { class: 'chip' }, String(exercises.length)),
      ),
      el(
      'div',
      { class: 'exercise-group__rows' },
      exercises.slice(0, 80).map((ex) => {
        const best = bests.get(ex.id);
        return el(
          'button',
          {
            type: 'button',
            class: 'exercise-row exercise-row__main group',
            onClick: () => showDetail(ex, best),
          },
          el(
            'span',
            { class: 'min-w-0 flex-1' },
            el('span', { class: 'exercise-row__name' }, ex.name),
            el(
              'small',
              { class: 'num' },
              best ? `${ex.equipment} · best ${kg(best.weight)} kg × ${best.reps}` : ex.equipment,
            ),
          ),
          icon('next', 'exercise-row__next w-4 h-4'),
        );
      }),
      ),
    );
  }

  function showDetail(ex, best) {
    const area = AREAS.find((item) => item.id === libraryView.area) || AREAS[0];
    paneIcon.replaceChildren(icon('dumbbell', 'w-6 h-6'));
    paneTitle.textContent = ex.name;
    paneBody.textContent = `${area.label} · ${ex.muscle}`;
    replace(
      headerAction,
      el('button', { type: 'button', class: 'exercise-detail__back', 'aria-label': `Back to ${area.label.toLowerCase()}`, onClick: paint }, icon('back', 'w-4 h-4'), 'Back'),
    );
    replace(paneContent, exerciseDetail(ex, best));
    requestAnimationFrame(() => document.querySelector('.exercise-pane__head')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  const categoryNav = el(
    'nav',
    { class: 'settings-nav__items', role: 'tablist', 'aria-label': 'Body areas' },
    AREAS.map((area) => {
      const button = el(
        'button',
        {
          type: 'button',
          class: ['settings-nav__item', area.id === libraryView.area && 'is-active'],
          role: 'tab',
          'aria-selected': String(area.id === libraryView.area),
          onClick: () => selectArea(area.id),
        },
        el('span', { class: 'settings-nav__item-icon' }, icon(area.icon, 'w-5 h-5')),
        el('span', { class: 'min-w-0' }, el('strong', null, area.label), el('small', null, area.short)),
        icon('next', 'settings-nav__arrow w-4 h-4'),
      );
      categoryButtons.set(area.id, button);
      return button;
    }),
  );

  paint();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Exercises', heading: 'Browse your exercise library', back: () => go('/') }),
      el(
        'main',
        { class: 'screen exercises-screen' },
        el(
          'section',
          { class: 'settings-workspace exercise-browser' },
          el(
            'aside',
            { class: 'settings-nav exercise-browser__nav' },
            el(
              'header',
              { class: 'settings-nav__head' },
              el('span', { class: 'settings-nav__brand' }, icon('dumbbell', 'w-6 h-6')),
              el('div', null, el('p', { class: 'label text-accent' }, 'Exercises'), el('h2', null, 'Choose a body area')),
            ),
            categoryNav,
            el(
              'div',
              { class: 'settings-nav__status' },
              el('span', { class: 'h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_rgb(var(--accent)/.45)]' }),
              el('span', null, el('strong', null, `${EXERCISES.length} guided movements`), el('small', null, 'Technique and common mistakes')),
            ),
          ),
          el(
            'div',
            { class: 'settings-content' },
            el(
              'section',
              { class: 'settings-pane exercise-pane', role: 'tabpanel' },
              el('header', { class: 'settings-pane__head exercise-pane__head' }, paneIcon, el('div', { class: 'min-w-0 flex-1' }, paneTitle, paneBody), headerAction),
              paneContent,
            ),
          ),
        ),
      ),
    ),
  };
}

function muscleDescription(muscle) {
  const descriptions = {
    Chest: 'Pressing and chest isolation',
    Back: 'Pulling and back strength',
    Shoulders: 'Presses and shoulder control',
    Biceps: 'Elbow flexion and curls',
    Triceps: 'Pressing and arm extension',
    Forearms: 'Grip and forearm strength',
    Quads: 'Knee-dominant leg work',
    Hamstrings: 'Hip hinges and leg curls',
    Glutes: 'Hip extension and stability',
    Calves: 'Lower-leg strength',
    Core: 'Trunk strength and control',
    'Total body': 'Coordinated full-body movements',
    Cardio: 'Simple conditioning options',
  };
  return descriptions[muscle] || 'Movement library';
}

function exerciseDetail(ex, best) {
  const info = coachingFor(ex.id);

  const section = (title, body, iconName) =>
    el(
      'section',
      { class: 'exercise-detail__section' },
      el('header', null, el('span', null, icon(iconName, 'w-5 h-5')), el('h3', null, title)),
      body,
    );

  const points = (items) => el(
    'ul',
    null,
    items.map((text) => el('li', null, icon('check', 'w-4 h-4'), el('span', null, text))),
  );

  return el(
    'div',
    { class: 'exercise-detail' },
    el(
      'div',
      { class: 'exercise-detail__summary' },
      el(
        'div',
        { class: 'exercise-detail__tags' },
        el('span', { class: 'chip' }, ex.muscle),
        el('span', { class: 'chip' }, ex.equipment),
        el('span', { class: 'chip' }, info.level),
      ),
      best
        ? el('div', { class: 'exercise-detail__best' }, el('span', null, 'Your best'), el('strong', { class: 'num' }, `${kg(best.weight)} kg × ${best.reps}`))
        : el('p', { class: 'exercise-detail__new' }, 'No performance recorded yet.'),
    ),
    section('How to perform it', el('p', null, info.how), 'info'),
    el(
      'div',
      { class: 'exercise-detail__grid' },
      section('Avoid these mistakes', points(info.errors), 'close'),
      section('Useful cues', points(info.tips), 'target'),
    ),
    hasCoaching(ex.id)
      ? null
      : el('p', { class: 'exercise-detail__note' }, 'Detailed coaching notes are not available for this exercise yet.'),
  );
}
