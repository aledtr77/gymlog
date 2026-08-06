/**
 * Routine editor.
 * Sets/reps/rest are starting values: they stay editable during the workout,
 * so three fields per row is enough here.
 */

import { h, replace } from '../dom.js';
import { icon } from '../icons.js';
import { confirmSheet, openSheet } from '../sheet.js';
import { toast } from '../toast.js';
import { pickExercises } from '../exercisePicker.js';
import { saveRoutine, state } from '../../core/store.js';
import { parseNum } from '../../core/format.js';

export function openRoutineEditor(routine, onSaved) {
  const draft = {
    ...routine,
    exercises: (routine.exercises || []).map((item) => ({ ...item })),
  };

  const listEl = h('div', { class: 'col col--tight' });

  const nameInput = h('input', {
    class: 'input',
    value: draft.name,
    placeholder: 'Nome routine',
    onInput: (event) => {
      draft.name = event.target.value;
    },
  });

  renderList();

  const handle = openSheet({
    title: 'Modifica routine',
    full: true,
    body: () =>
      h(
        'div',
        { class: 'col' },
        h(
          'div',
          { class: 'field' },
          h('span', { class: 'field__label' }, 'Nome'),
          nameInput,
        ),
        listEl,
        h(
          'button',
          { type: 'button', class: 'btn btn--ghost btn--block', onClick: addExercises },
          icon('plus'),
          'Aggiungi esercizio',
        ),
      ),
    footer: [
      h('button', { type: 'button', class: 'btn btn--ghost grow', onClick: () => handle.close() }, 'Annulla'),
      h('button', { type: 'button', class: 'btn btn--primary grow', onClick: save }, 'Salva'),
    ],
  });

  function renderList() {
    if (!draft.exercises.length) {
      replace(
        listEl,
        h('p', { class: 'tiny' }, 'Nessun esercizio in questa routine.'),
      );
      return;
    }

    replace(
      listEl,
      ...draft.exercises.map((item, index) =>
        h(
          'div',
          { class: 'card' },
          h(
            'div',
            { class: 'row row--between' },
            h('strong', { class: 'grow', style: { fontSize: '15px' } }, item.name),
            h(
              'button',
              {
                type: 'button',
                class: 'icon-btn',
                'aria-label': `Rimuovi ${item.name}`,
                onClick: () => {
                  draft.exercises.splice(index, 1);
                  renderList();
                },
              },
              icon('trash'),
            ),
          ),
          h(
            'div',
            { class: 'row', style: { marginTop: '8px' } },
            numberField('Serie', item.sets, (value) => {
              item.sets = value ?? 3;
            }),
            numberField('Reps', item.reps, (value) => {
              item.reps = value ?? '';
            }),
            numberField('Recupero s', item.restSeconds, (value) => {
              item.restSeconds = value ?? 90;
            }),
          ),
        ),
      ),
    );
  }

  function numberField(label, value, onChange) {
    return h(
      'label',
      { class: 'field grow' },
      h('span', { class: 'field__label' }, label),
      h('input', {
        class: 'input',
        type: 'text',
        inputmode: 'numeric',
        value: value ?? '',
        style: { textAlign: 'center' },
        onInput: (event) => onChange(parseNum(event.target.value)),
      }),
    );
  }

  async function addExercises() {
    const chosen = await pickExercises({ multiple: true, title: 'Aggiungi alla routine' });
    if (!chosen.length) return;

    draft.exercises.push(
      ...chosen.map((item) => ({
        exerciseId: item.id,
        name: item.name,
        sets: 3,
        reps: 10,
        restSeconds: item.restSeconds ?? state.settings.defaultRest,
      })),
    );
    renderList();
  }

  async function save() {
    if (!draft.name.trim()) {
      toast('Dai un nome alla routine', { variant: 'err' });
      return;
    }

    if (!draft.exercises.length) {
      const ok = await confirmSheet({
        title: 'Routine senza esercizi',
        message: 'Vuoi salvarla comunque?',
        confirmLabel: 'Salva',
      });
      if (!ok) return;
    }

    await saveRoutine({ ...draft, name: draft.name.trim() });
    handle.close();
    toast('Routine aggiornata', { variant: 'ok', iconName: 'check' });
    onSaved?.();
  }
}
