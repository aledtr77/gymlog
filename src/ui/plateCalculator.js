/**
 * Plate calculator.
 * Lives in a sheet that can be summoned anywhere, and is reachable by long
 * pressing the load field mid-workout: that is where it is actually needed,
 * not in a separate tab you have to go find.
 */

import { h, replace } from './dom.js';
import { icon } from './icons.js';
import { openSheet } from './sheet.js';
import { BAR_WEIGHTS, PLATE_COLORS, calculatePlates, formatKg } from '../core/plates.js';
import { state, updateSettings } from '../core/store.js';
import { tapFeedback } from '../core/feedback.js';

export function openPlateCalculator({ targetWeight = null } = {}) {
  let target = Number(targetWeight) || 60;
  let bar = state.settings.barWeight ?? 20;

  const readout = h('div');
  const barbell = h('div', { class: 'barbell' });
  const legend = h('div', { class: 'plate-legend' });
  const message = h('p', { class: 'tiny' });

  const input = h('input', {
    class: 'input',
    type: 'number',
    inputmode: 'decimal',
    step: '0.5',
    min: '0',
    value: String(target),
    onInput: (event) => {
      target = Number(event.target.value);
      render();
    },
  });

  const barRow = h(
    'div',
    { class: 'chips' },
    BAR_WEIGHTS.map((option) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': String(option.value === bar),
          onClick: (event) => {
            bar = option.value;
            updateSettings({ barWeight: bar });
            barRow
              .querySelectorAll('.chip')
              .forEach((chip) => chip.setAttribute('aria-pressed', String(chip === event.currentTarget)));
            render();
          },
        },
        option.label,
      ),
    ),
  );

  function step(delta) {
    target = Math.max(0, Math.round((target + delta) * 100) / 100);
    input.value = String(target);
    tapFeedback(state.settings.vibration);
    render();
  }

  function render() {
    const result = calculatePlates(target, bar, state.settings.availablePlates);

    replace(
      readout,
      h(
        'div',
        { class: 'big-readout' },
        h('span', { class: 'big-readout__v' }, formatKg(result.sideWeight)),
        h('span', { class: 'big-readout__u' }, 'kg per lato'),
      ),
    );

    const plateNodes = [];
    for (const plate of result.plates) {
      for (let i = 0; i < plate.count; i += 1) {
        plateNodes.push(
          h('div', { class: 'plate', 'data-w': String(plate.weight) }, formatKg(plate.weight)),
        );
      }
    }

    replace(
      barbell,
      h('div', { class: 'barbell__bar' }),
      h('div', { class: 'barbell__collar' }),
      // Heavy plates sit inside, against the collar, the way you really
      // load a bar: plateNodes is already sorted heaviest first.
      h('div', { class: 'barbell__plates' }, plateNodes),
    );

    replace(
      legend,
      result.plates.length
        ? result.plates.map((plate) =>
            h(
              'span',
              { class: 'plate-pill' },
              h('span', {
                class: 'plate-pill__dot',
                style: { background: PLATE_COLORS[plate.weight] || '#8b929e' },
              }),
              `${plate.count} × ${formatKg(plate.weight)} kg`,
            ),
          )
        : h('span', { class: 'tiny' }, 'Solo bilanciere, nessun disco.'),
    );

    message.textContent = result.error
      ? result.error
      : `Totale caricato: ${formatKg(result.achievedTotal)} kg`;
    message.style.color = result.error ? 'var(--warn)' : 'var(--text-3)';
  }

  render();

  return openSheet({
    title: 'Calcolatore dischi',
    body: () =>
      h(
        'div',
        { class: 'col' },
        h(
          'div',
          { class: 'field' },
          h('span', { class: 'field__label' }, 'Peso totale sul bilanciere'),
          h(
            'div',
            { class: 'stepper' },
            h('button', { type: 'button', class: 'stepper__btn', onClick: () => step(-2.5) }, '−2,5'),
            input,
            h('button', { type: 'button', class: 'stepper__btn', onClick: () => step(2.5) }, '+2,5'),
          ),
        ),
        h(
          'div',
          { class: 'field' },
          h('span', { class: 'field__label' }, 'Bilanciere'),
          barRow,
        ),
        h('div', { class: 'card card--flat' }, readout, barbell),
        legend,
        message,
      ),
  });
}

export function plateCalculatorButton(getWeight) {
  return h(
    'button',
    {
      type: 'button',
      class: 'icon-btn',
      'aria-label': 'Calcolatore dischi',
      onClick: () => openPlateCalculator({ targetWeight: getWeight() }),
    },
    icon('calculator'),
  );
}
