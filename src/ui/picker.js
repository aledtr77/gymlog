/**
 * Adding an exercise: a search field and a list. Nothing else.
 *
 * Returns the chosen { id, name }, or null if dismissed. Typing a name that
 * matches nothing offers it as a custom exercise, so the library never
 * becomes a wall between you and logging a set.
 */

import { h, replace } from './dom.js';
import { EXERCISES, normalize } from '../data/exercises.js';

export function openPicker() {
  return new Promise((resolve) => {
    const results = h('div', { class: 'picker__list' });

    const input = h('input', {
      class: 'picker__search',
      type: 'search',
      placeholder: 'Cerca esercizio…',
      autocomplete: 'off',
      onInput: () => paint(input.value),
    });

    const layer = h(
      'div',
      { class: 'picker' },
      h(
        'div',
        { class: 'picker__head' },
        input,
        h(
          'button',
          { type: 'button', class: 'picker__close', onClick: () => done(null), 'aria-label': 'Chiudi' },
          '×',
        ),
      ),
      results,
    );

    document.body.appendChild(layer);
    paint('');
    input.focus();

    function paint(query) {
      const needle = normalize(query.trim());
      const matches = needle
        ? EXERCISES.filter((e) => e.search.includes(needle)).slice(0, 60)
        : EXERCISES.slice(0, 60);

      const nodes = matches.map((exercise) =>
        h(
          'button',
          {
            type: 'button',
            class: 'picker__item',
            onClick: () => done({ id: exercise.id, name: exercise.name }),
          },
          h('span', null, exercise.name),
          h('span', { class: 'picker__muscle' }, exercise.muscle),
        ),
      );

      if (query.trim() && !matches.length) {
        nodes.push(
          h(
            'button',
            {
              type: 'button',
              class: 'picker__item',
              onClick: () =>
                done({ id: `custom-${normalize(query.trim())}`, name: query.trim() }),
            },
            h('span', null, `Aggiungi “${query.trim()}”`),
          ),
        );
      }

      replace(results, ...nodes);
    }

    function done(value) {
      layer.remove();
      resolve(value);
    }
  });
}
