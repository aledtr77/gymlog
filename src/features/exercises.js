/**
 * Exercise library: instant search, filters, favourites, and how to perform
 * each movement. Search runs over a precomputed normalised string so typing
 * stays smooth on the full library without debouncing.
 */
import { el, replace } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, blank, sheet } from '../ui/components.js';
import { EXERCISES, MUSCLES, normalize } from '../data/exercises.js';
import { coachingFor, hasCoaching } from '../data/coaching.js';
import { state, toggleFavourite, isFavourite } from '../core/state.js';
import { go } from '../core/router.js';
import { personalBests } from '../core/training.js';
import { kg } from '../utils/num.js';

// Favourite writes redraw the current route. Keeping this small view model at
// module level means a star tap no longer wipes search and filter context.
const libraryView = { query: '', muscle: '', favourites: false };

export function render() {
  const list = el('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-2.5 mt-4' });
  const count = el('p', { class: 'text-sm font-bold text-ink-2' });
  const countMobile = el('p', { class: 'text-sm font-bold text-ink-2' });
  const bests = new Map(personalBests(state.sets).map((b) => [b.exerciseId, b]));

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

  const viewToggle = el(
    'div',
    { class: 'segmented', 'aria-label': 'Exercise list view' },
    el('button', { type: 'button', onClick: () => setFavourites(false) }, 'All'),
    el(
      'button',
      { type: 'button', onClick: () => setFavourites(true) },
      icon('star', 'w-4 h-4 inline mr-1.5'),
      'Favorites',
    ),
  );

  const muscleSelect = el(
    'select',
    {
      class: 'field min-w-0 lg:w-[220px]',
      'aria-label': 'Filter by muscle group',
      value: libraryView.muscle,
      onChange: (event) => {
        libraryView.muscle = event.target.value;
        paint();
      },
    },
    el('option', { value: '' }, 'All muscle groups'),
    MUSCLES.map((muscle) => el('option', { value: muscle }, muscle)),
  );

  function setFavourites(value) {
    libraryView.favourites = value;
    paintControls();
    paint();
  }

  function paintControls() {
    const [allButton, favouriteButton] = viewToggle.querySelectorAll('button');
    allButton.setAttribute('aria-pressed', String(!libraryView.favourites));
    favouriteButton.setAttribute('aria-pressed', String(libraryView.favourites));
    muscleSelect.value = libraryView.muscle;
  }

  function paint() {
    const needle = normalize(libraryView.query.trim());
    const found = EXERCISES.filter((ex) => {
      if (libraryView.favourites && !isFavourite(ex.id)) return false;
      if (libraryView.muscle && ex.muscle !== libraryView.muscle) return false;
      if (needle && !ex.search.includes(needle)) return false;
      return true;
    });

    const countText = `${found.length} ${found.length === 1 ? 'exercise' : 'exercises'}`;
    count.textContent = countText;
    countMobile.textContent = countText;

    if (!found.length) {
      replace(list, blank({ title: 'No results', body: 'Try another name or adjust the filters.' }));
      return;
    }

    replace(
      list,
      found.slice(0, 80).map((ex) => {
        const best = bests.get(ex.id);
        const favourite = isFavourite(ex.id);
        return el(
          'div',
          { class: 'group flex items-center gap-2 min-h-[76px] rounded-2xl bg-surface border border-line transition hover:border-accent/40 hover:bg-surface-2/60' },
          el(
            'button',
            {
              type: 'button',
              class: 'flex-1 self-stretch min-w-0 flex flex-col justify-center items-start px-4 py-3 text-left',
              onClick: () => openDetail(ex, best),
            },
            el('span', { class: 'font-extrabold truncate w-full group-hover:text-accent transition' }, ex.name),
            el(
              'span',
              { class: 'text-xs text-ink-3 num' },
              best ? `${ex.muscle} · best ${kg(best.weight)} kg × ${best.reps}` : `${ex.muscle} · ${ex.equipment}`,
            ),
          ),
          el(
            'button',
            {
              type: 'button',
              class: ['w-11 h-11 mr-2 grid place-items-center rounded-xl transition hover:bg-bg', favourite ? 'text-accent' : 'text-ink-3'],
              'aria-label': favourite ? `Remove ${ex.name} from favorites` : `Add ${ex.name} to favorites`,
              'aria-pressed': String(favourite),
              onClick: () => toggleFavourite(ex.id, ex.name),
            },
            icon('star', 'w-5 h-5'),
          ),
        );
      }),
    );
  }

  paintControls();
  paint();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Exercises', heading: 'Browse your exercise library', back: () => go('/') }),
      el(
        'main',
        { class: 'screen' },
        el(
          'div',
          { class: 'flex flex-col gap-3 lg:rounded-xl3 lg:border lg:border-line lg:bg-surface/45 lg:p-5' },
          el(
            'div',
            { class: 'relative' },
            el('span', { class: 'absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none' }, icon('search', 'w-5 h-5')),
            search,
          ),
          el(
            'div',
            { class: 'grid grid-cols-[auto_minmax(0,1fr)] lg:flex lg:items-center gap-2.5' },
            viewToggle,
            muscleSelect,
            el('span', { class: 'hidden lg:block ml-auto' }, count),
          ),
        ),
        el('div', { class: 'mt-4 flex items-center justify-between lg:hidden' }, countMobile),
        list,
      ),
    ),
  };
}

function openDetail(ex, best) {
  const info = coachingFor(ex.id);

  const section = (title, items) =>
    el(
      'section',
      { class: 'mt-5' },
      el('h3', { class: 'label mb-2' }, title),
      el(
        'ul',
        { class: 'flex flex-col gap-1.5' },
        items.map((t) =>
          el(
            'li',
            { class: 'flex gap-2 text-sm text-ink-2' },
            el('span', { class: 'text-accent' }, '·'),
            el('span', null, t),
          ),
        ),
      ),
    );

  sheet({
    title: ex.name,
    body: el(
      'div',
      null,
      el(
        'div',
        { class: 'flex flex-wrap gap-2' },
        el('span', { class: 'chip' }, ex.muscle),
        el('span', { class: 'chip' }, ex.equipment),
        el('span', { class: 'chip' }, info.level),
      ),
      best
        ? el(
            'div',
            { class: 'tile mt-4' },
            el('p', { class: 'label' }, 'Your best'),
            el('p', { class: 'text-2xl font-black num mt-1' }, `${kg(best.weight)} kg × ${best.reps}`),
          )
        : null,
      el('p', { class: 'mt-5 text-[15px] leading-relaxed text-ink-2' }, info.how),
      section('Common mistakes', info.errors),
      section('Coaching tips', info.tips),
      hasCoaching(ex.id)
        ? null
        : el(
            'p',
            { class: 'mt-6 text-xs text-ink-3' },
            'Detailed coaching notes are not available for this exercise yet.',
          ),
    ),
  });
}
