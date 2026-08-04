/**
 * Selettore esercizi.
 * Ricerca immediata, filtro per gruppo muscolare, selezione multipla:
 * aggiungere cinque esercizi a una scheda deve costare un solo passaggio,
 * non cinque aperture di pannello.
 */

import { h, raf, replace } from './dom.js';
import { icon } from './icons.js';
import { openSheet, promptSheet } from './sheet.js';
import { toast } from './toast.js';
import { MUSCLES, normalize } from '../data/exercises.js';
import { addCustomExercise, allExercises, state } from '../core/store.js';

export function pickExercises({ multiple = true, title = 'Aggiungi esercizio' } = {}) {
  return new Promise((resolve) => {
    const picked = new Map();
    let query = '';
    let muscle = null;
    let listEl;
    let confirmBtn;
    let settled = false;

    const searchInput = h('input', {
      class: 'input',
      type: 'search',
      placeholder: 'Cerca esercizio…',
      enterkeyhint: 'search',
      autocomplete: 'off',
      onInput: (event) => {
        query = event.target.value;
        renderList();
      },
    });

    const chipsRow = h(
      'div',
      { class: 'chips' },
      h(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': 'true',
          onClick: (event) => selectMuscle(null, event.currentTarget),
        },
        'Tutti',
      ),
      MUSCLES.map((name) =>
        h(
          'button',
          {
            type: 'button',
            class: 'chip',
            'aria-pressed': 'false',
            onClick: (event) => selectMuscle(name, event.currentTarget),
          },
          name,
        ),
      ),
    );

    function selectMuscle(value, button) {
      muscle = value;
      chipsRow.querySelectorAll('.chip').forEach((chip) => {
        chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
      });
      renderList();
    }

    const handle = openSheet({
      title,
      full: true,
      sticky: [
        h('div', { class: 'search' }, icon('search'), searchInput),
        chipsRow,
      ],
      body: () => (listEl = h('div')),
      footer: [
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--ghost',
            onClick: createCustom,
            'aria-label': 'Crea esercizio personalizzato',
          },
          icon('plus'),
          'Nuovo',
        ),
        (confirmBtn = h(
          'button',
          {
            type: 'button',
            class: 'btn btn--primary grow',
            disabled: true,
            onClick: () => {
              settle([...picked.values()]);
              handle.close();
            },
          },
          'Aggiungi',
        )),
      ],
      onClose: () => settle([]),
    });

    renderList();
    // Su desktop il focus automatico è comodo; su mobile aprirebbe la
    // tastiera coprendo metà elenco, quindi si evita.
    if (!('ontouchstart' in window)) raf(() => searchInput.focus());

    function renderList() {
      const normalizedQuery = normalize(query.trim());
      const results = allExercises()
        .filter((item) => {
          if (muscle && item.muscle !== muscle) return false;
          if (!normalizedQuery) return true;
          return (item.search || normalize(item.name)).includes(normalizedQuery);
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'it'));

      if (!results.length) {
        replace(
          listEl,
          h(
            'div',
            { class: 'empty' },
            h('div', { class: 'empty__icon' }, icon('search')),
            h('h3', null, 'Nessun risultato'),
            h('p', null, 'Nessun esercizio corrisponde alla ricerca. Puoi crearne uno nuovo.'),
          ),
        );
        return;
      }

      // Raggruppato per gruppo muscolare, a meno che non si stia già
      // filtrando o cercando: in quel caso l'elenco piatto è più veloce.
      const grouped = !muscle && !normalizedQuery;
      const nodes = [];
      let currentGroup = null;

      for (const item of grouped
        ? [...results].sort(
            (a, b) => a.muscle.localeCompare(b.muscle, 'it') || a.name.localeCompare(b.name, 'it'),
          )
        : results) {
        if (grouped && item.muscle !== currentGroup) {
          currentGroup = item.muscle;
          nodes.push(h('div', { class: 'ex-group' }, currentGroup));
        }
        nodes.push(renderItem(item));
      }

      replace(listEl, ...nodes);
    }

    function renderItem(item) {
      const isPicked = picked.has(item.id);
      const node = h(
        'button',
        {
          type: 'button',
          class: ['ex-item', isPicked && 'is-picked'],
          onClick: () => togglePick(item, node),
        },
        h(
          'div',
          { class: 'ex-item__body' },
          h('div', { class: 'ex-item__name' }, item.name),
          h('div', { class: 'ex-item__meta' }, `${item.muscle} · ${item.equipment}`),
        ),
        h('span', { class: 'ex-item__pick' }, icon('check')),
      );
      return node;
    }

    function togglePick(item, node) {
      if (!multiple) {
        settle([item]);
        handle.close();
        return;
      }

      if (picked.has(item.id)) picked.delete(item.id);
      else picked.set(item.id, item);

      node.classList.toggle('is-picked', picked.has(item.id));
      confirmBtn.disabled = picked.size === 0;
      confirmBtn.textContent = picked.size ? `Aggiungi (${picked.size})` : 'Aggiungi';
    }

    async function createCustom() {
      const name = await promptSheet({
        title: 'Nuovo esercizio',
        label: 'Nome',
        placeholder: 'Es. Panca guidata Smith',
        confirmLabel: 'Crea',
      });
      if (!name) return;

      const id = `custom-${normalize(name).replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      const created = await addCustomExercise({
        id,
        name,
        muscle: muscle || 'Total body',
        equipment: 'Altro',
        restSeconds: state.settings.defaultRest,
        search: normalize(name),
      });

      toast(`"${name}" aggiunto alla libreria`, { variant: 'ok', iconName: 'check' });

      if (!multiple) {
        settle([created]);
        handle.close();
        return;
      }

      picked.set(created.id, created);
      confirmBtn.disabled = false;
      confirmBtn.textContent = `Aggiungi (${picked.size})`;
      renderList();
    }

    function settle(result) {
      if (settled) return;
      settled = true;
      resolve(result);
    }
  });
}
