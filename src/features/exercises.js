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

export function render() {
  let query = '';
  let muscle = null;
  let favesOnly = false;

  const list = el('div', { class: 'flex flex-col gap-2 mt-3' });
  const count = el('p', { class: 'label mt-4' });
  const bests = new Map(personalBests(state.sets).map((b) => [b.exerciseId, b]));

  const search = el('input', {
    type: 'search',
    class: 'field',
    placeholder: 'Cerca esercizio…',
    'aria-label': 'Cerca esercizio',
    autocomplete: 'off',
    onInput: (e) => {
      query = e.target.value;
      paint();
    },
  });

  const chip = (label, active, onClick) =>
    el(
      'button',
      { type: 'button', class: ['chip shrink-0', active && 'chip-on'], onClick, 'aria-pressed': String(active) },
      label,
    );

  const filters = el('div', { class: 'flex gap-2 overflow-x-auto no-bar py-1 -mx-4 px-4' });

  function paintFilters() {
    replace(
      filters,
      chip('Preferiti', favesOnly, () => {
        favesOnly = !favesOnly;
        paintFilters();
        paint();
      }),
      chip('Tutti', !muscle, () => {
        muscle = null;
        paintFilters();
        paint();
      }),
      MUSCLES.map((m) =>
        chip(m, muscle === m, () => {
          muscle = muscle === m ? null : m;
          paintFilters();
          paint();
        }),
      ),
    );
  }

  function paint() {
    const needle = normalize(query.trim());
    const found = EXERCISES.filter((ex) => {
      if (favesOnly && !isFavourite(ex.id)) return false;
      if (muscle && ex.muscle !== muscle) return false;
      if (needle && !ex.search.includes(needle)) return false;
      return true;
    });

    count.textContent = `${found.length} esercizi`;

    if (!found.length) {
      replace(list, blank({ title: 'Nessun risultato', body: 'Prova con un altro nome o togli i filtri.' }));
      return;
    }

    replace(
      list,
      found.slice(0, 80).map((ex) => {
        const best = bests.get(ex.id);
        return el(
          'div',
          { class: 'flex items-center gap-2 rounded-2xl bg-surface border border-line' },
          el(
            'button',
            {
              type: 'button',
              class: 'flex-1 min-w-0 flex flex-col items-start px-4 py-3 text-left',
              onClick: () => openDetail(ex, best),
            },
            el('span', { class: 'font-bold truncate w-full' }, ex.name),
            el(
              'span',
              { class: 'text-xs text-ink-3 num' },
              best ? `${ex.muscle} · record ${kg(best.weight)} kg × ${best.reps}` : `${ex.muscle} · ${ex.equipment}`,
            ),
          ),
          el(
            'button',
            {
              type: 'button',
              class: ['w-11 h-11 mr-2 grid place-items-center rounded-full', isFavourite(ex.id) ? 'text-accent' : 'text-ink-3'],
              'aria-label': isFavourite(ex.id) ? `Togli ${ex.name} dai preferiti` : `Aggiungi ${ex.name} ai preferiti`,
              'aria-pressed': String(isFavourite(ex.id)),
              onClick: async () => {
                await toggleFavourite(ex.id, ex.name);
                paint();
              },
            },
            icon('star', 'w-5 h-5'),
          ),
        );
      }),
    );
  }

  paintFilters();
  paint();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Esercizi', back: () => go('/') }),
      el('main', { class: 'screen' }, search, filters, count, list),
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
            el('p', { class: 'label' }, 'Il tuo record'),
            el('p', { class: 'text-2xl font-black num mt-1' }, `${kg(best.weight)} kg × ${best.reps}`),
          )
        : null,
      el('p', { class: 'mt-5 text-[15px] leading-relaxed text-ink-2' }, info.how),
      section('Errori comuni', info.errors),
      section('Consigli', info.tips),
      hasCoaching(ex.id)
        ? null
        : el(
            'p',
            { class: 'mt-6 text-xs text-ink-3' },
            'Scheda tecnica dettagliata non ancora disponibile per questo esercizio.',
          ),
    ),
  });
}
