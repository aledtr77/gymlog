/**
 * Active workout screen.
 *
 * The interaction model is the one the reference apps settled on (Hevy,
 * Strong): one card per exercise, and inside each card one row per set with
 * the columns SET / PREVIOUS / KG / REPS / done. Logging a set costs a
 * single tap on the tick, with values prefilled from last time. The
 * "previous" column is the most useful thing you can have in front of you
 * mid-session, which is why it holds fixed space rather than hiding.
 */

import { h, raf, replace } from '../dom.js';
import { icon } from '../icons.js';
import { confirmSheet, openMenu, openSheet, promptSheet } from '../sheet.js';
import { toast } from '../toast.js';
import { pickExercises } from '../exercisePicker.js';
import { openPlateCalculator } from '../plateCalculator.js';
import {
  completeActive,
  discardActive,
  registerSetForRecords,
  saveRoutine,
  setActive,
  state,
} from '../../core/store.js';
import {
  addExercises,
  addSet,
  exerciseVolume,
  moveExercise,
  removeExercise,
  removeSet,
  routineFromWorkout,
  updateExercise,
  updateSet,
} from '../../core/workout.js';
import { summarizeWorkout, PR_LABELS } from '../../core/metrics.js';
import { clock, compactKg, num, parseNum } from '../../core/format.js';
import { startRest, stopRest } from '../../core/restTimer.js';
import { keepScreenAwake, tapFeedback } from '../../core/feedback.js';

const SET_TYPE_ORDER = ['normal', 'warmup', 'drop', 'failure'];
const SET_TYPE_LABEL = {
  normal: 'Serie di lavoro',
  warmup: 'Riscaldamento',
  drop: 'Drop set',
  failure: 'A cedimento',
};
const SET_TYPE_SHORT = { warmup: 'W', drop: 'D', failure: 'C' };

export function workoutView(ctx) {
  const listEl = h('div', { class: 'col' });
  const timeEl = h('span', { class: 'wo-metric__v' }, '00:00');
  const volumeEl = h('span', { class: 'wo-metric__v' }, '0');
  const setsEl = h('span', { class: 'wo-metric__v' }, '0');

  const bar = h(
    'div',
    { class: 'wo-bar' },
    h(
      'div',
      { class: 'wo-bar__inner' },
      h(
        'div',
        { class: 'wo-bar__stats' },
        metric(timeEl, 'Durata', 'wo-metric--time'),
        metric(volumeEl, 'Volume kg'),
        metric(setsEl, 'Serie'),
      ),
      h(
        'button',
        { type: 'button', class: 'icon-btn', 'aria-label': 'Opzioni allenamento', onClick: openWorkoutMenu },
        icon('more'),
      ),
      h('button', { type: 'button', class: 'btn btn--ok btn--sm', onClick: finish }, 'Fine'),
    ),
  );

  const node = h(
    'div',
    null,
    bar,
    h(
      'main',
      { class: 'main main--nonav' },
      h(
        'div',
        { class: 'view' },
        h(
          'button',
          { type: 'button', class: 'appbar__title', style: { textAlign: 'left' }, onClick: rename },
          state.active?.name || 'Allenamento',
        ),
        listEl,
        h(
          'button',
          { type: 'button', class: 'btn btn--primary btn--block btn--lg', onClick: addExerciseFlow },
          icon('plus'),
          'Aggiungi esercizio',
        ),
        // Destructive action, deliberately understated and kept away from
        // the primary button: the same entry already lives in the ... menu.
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--quiet btn--sm',
            style: { alignSelf: 'center', marginTop: '4px', color: 'var(--text-3)' },
            onClick: cancelWorkout,
          },
          'Annulla allenamento',
        ),
      ),
    ),
  );

  renderList();
  syncStats();

  const ticker = setInterval(syncStats, 1000);
  if (state.settings.keepAwake) keepScreenAwake(true);

  /* ---------------------------------------------------------------- state */

  function active() {
    return state.active;
  }

  function commit(next, options) {
    setActive(next, options);
  }

  function blockById(id) {
    return active()?.exercises.find((ex) => ex.id === id) || null;
  }

  function setById(blockId, setId) {
    return blockById(blockId)?.sets.find((s) => s.id === setId) || null;
  }

  /* ------------------------------------------------------------ rendering */

  function renderList() {
    const workout = active();
    if (!workout) return;

    if (!workout.exercises.length) {
      replace(
        listEl,
        h(
          'div',
          { class: 'card' },
          h(
            'div',
            { class: 'empty' },
            h('div', { class: 'empty__icon' }, icon('dumbbell')),
            h('h3', null, 'Nessun esercizio'),
            h('p', null, 'Aggiungi il primo esercizio per iniziare a registrare le serie.'),
          ),
        ),
      );
      return;
    }

    replace(listEl, ...workout.exercises.map(buildCard));
  }

  function buildCard(block) {
    const rows = h('div');
    const card = h(
      'section',
      { class: 'ex', 'data-block': block.id },
      h(
        'div',
        { class: 'ex__head' },
        h(
          'button',
          { type: 'button', class: 'ex__title', onClick: () => openExerciseMenu(block.id) },
          h('span', { class: 'ex__name' }, block.name),
          h('span', { class: 'ex__meta' }, exerciseMeta(block)),
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'icon-btn',
            'aria-label': `Opzioni ${block.name}`,
            onClick: () => openExerciseMenu(block.id),
          },
          icon('more'),
        ),
      ),
      exerciseTarget(block),
      block.notes ? h('p', { class: 'ex__note' }, block.notes) : null,
      h(
        'div',
        { class: 'set-head' },
        h('span', null, 'Serie'),
        h('span', null, 'Precedente'),
        h('span', null, 'Kg'),
        h('span', null, 'Reps'),
        h('span', null, ''),
      ),
      rows,
      h(
        'div',
        { class: 'ex__actions' },
        h(
          'button',
          {
            type: 'button',
            class: 'ex__add',
            onClick: () => {
              commit(addSet(active(), block.id));
              refreshCard(block.id);
              tapFeedback(state.settings.vibration);
            },
          },
          icon('plus'),
          'Aggiungi serie',
        ),
      ),
    );

    // Working sets are numbered 1..n; warmup, drop and failure sets carry a
    // letter instead, as in the reference apps.
    let workingNumber = 0;
    replace(
      rows,
      ...block.sets.map((set) => {
        if (set.type === 'normal') workingNumber += 1;
        return buildRow(block, set, set.type === 'normal' ? workingNumber : null);
      }),
    );
    updateCardState(card, block.id);
    return card;
  }

  function refreshCard(blockId) {
    const card = listEl.querySelector(`[data-block="${blockId}"]`);
    const block = blockById(blockId);
    if (!card || !block) {
      renderList();
      return;
    }
    const fresh = buildCard(block);
    card.replaceWith(fresh);
    syncStats();
  }

  /**
   * The line under the exercise name. When the progression engine has an
   * opinion it goes first: "what do I put on the bar" beats "how many sets
   * have I done" every time you look at this mid-session.
   */
  function exerciseTarget(block) {
    const target = block.target;
    if (!target) return null;

    const headline =
      target.weight === null
        ? `Obiettivo ${target.reps} reps · trova il carico`
        : `Obiettivo ${num(target.weight)} kg × ${target.reps}`;

    return h(
      'div',
      { class: ['ex__target', `ex__target--${target.status}`] },
      h('span', { class: 'ex__target-head' }, headline),
      h('span', { class: 'ex__target-why' }, target.reason),
    );
  }

  function exerciseMeta(block) {
    const done = block.sets.filter((s) => s.done).length;
    const rest = block.restSeconds
      ? `recupero ${Math.round(block.restSeconds / 60) >= 1 && block.restSeconds % 60 === 0 ? `${block.restSeconds / 60} min` : `${block.restSeconds}s`}`
      : 'nessun recupero';
    const volume = exerciseVolume(block);
    return `${done}/${block.sets.length} serie · ${rest}${volume ? ` · ${compactKg(volume)} kg` : ''}`;
  }

  function buildRow(block, set, setNumber) {
    const previous = previousFor(block, set);

    const weightInput = h('input', {
      class: 'set-input',
      type: 'text',
      inputmode: 'decimal',
      enterkeyhint: 'next',
      value: num(set.weight),
      placeholder: previous ? num(previous.weight) : '—',
      'aria-label': 'Carico in kg',
      onInput: (event) => onFieldInput(block.id, set.id, 'weight', event.target.value),
      onFocus: (event) => event.target.select(),
    });

    const repsInput = h('input', {
      class: 'set-input',
      type: 'text',
      inputmode: 'numeric',
      enterkeyhint: 'done',
      value: num(set.reps),
      placeholder: previous ? num(previous.reps) : '—',
      'aria-label': 'Ripetizioni',
      onInput: (event) => onFieldInput(block.id, set.id, 'reps', event.target.value),
      onFocus: (event) => event.target.select(),
    });

    const numBtn = h(
      'button',
      {
        type: 'button',
        class: 'set-num',
        'data-type': set.type,
        'aria-label': `Tipo serie: ${SET_TYPE_LABEL[set.type]}`,
        onClick: () => cycleType(block.id, set.id),
      },
      SET_TYPE_SHORT[set.type] || String(setNumber ?? ''),
    );

    const prevBtn = h(
      'button',
      {
        type: 'button',
        class: 'set-prev',
        disabled: !previous,
        'aria-label': previous ? 'Ricopia i valori precedenti' : 'Nessun dato precedente',
        onClick: () => {
          if (!previous) return;
          weightInput.value = num(previous.weight);
          repsInput.value = num(previous.reps);
          commit(
            updateSet(active(), block.id, set.id, {
              weight: previous.weight,
              reps: previous.reps,
            }),
          );
          tapFeedback(state.settings.vibration);
        },
      },
      previous ? `${num(previous.weight)} × ${num(previous.reps)}` : '—',
    );

    const checkBtn = h(
      'button',
      {
        type: 'button',
        class: 'set-check',
        'aria-label': 'Segna serie come completata',
        'aria-pressed': String(Boolean(set.done)),
        onClick: () => toggleDone(block.id, set.id, row, weightInput, repsInput),
      },
      icon('check'),
    );

    const row = h(
      'div',
      {
        class: ['set-row', set.done && 'is-done', set.done && set.pr && 'is-pr'],
        'data-set': set.id,
      },
      numBtn,
      prevBtn,
      weightInput,
      repsInput,
      checkBtn,
    );

    const wrap = h(
      'div',
      { class: 'set-wrap' },
      h('div', { class: 'set-wrap__del' }, icon('trash')),
      row,
    );

    attachSwipeToDelete(wrap, row, () => deleteSet(block.id, set.id));
    return wrap;
  }

  /** The matching set from last time, aligned by position. */
  function previousFor(block, set) {
    const history = state.lastPerformance.get(block.exerciseId);
    if (!history) return null;

    const index = block.sets
      .filter((s) => s.type !== 'warmup')
      .findIndex((s) => s.id === set.id);
    if (index < 0) return null;

    return history.sets[index] || null;
  }

  /* ---------------------------------------------------------- interaction */

  function onFieldInput(blockId, setId, field, rawValue) {
    const parsed = parseNum(rawValue);
    commit(updateSet(active(), blockId, setId, { [field]: parsed === null ? '' : parsed }));
    syncStats();
  }

  function cycleType(blockId, setId) {
    const set = setById(blockId, setId);
    if (!set) return;
    const next = SET_TYPE_ORDER[(SET_TYPE_ORDER.indexOf(set.type) + 1) % SET_TYPE_ORDER.length];
    commit(updateSet(active(), blockId, setId, { type: next }));
    tapFeedback(state.settings.vibration);
    refreshCard(blockId);
  }

  async function toggleDone(blockId, setId, row, weightInput, repsInput) {
    const block = blockById(blockId);
    const set = setById(blockId, setId);
    if (!block || !set) return;

    if (set.done) {
      commit(updateSet(active(), blockId, setId, { done: false, completedAt: null, pr: false }));
      row.classList.remove('is-done', 'is-pr');
      row.querySelector('.set-check').setAttribute('aria-pressed', 'false');
      updateCardState(row.closest('.ex'), blockId);
      syncStats();
      return;
    }

    // Empty fields fall back to the values suggested by last time, which is
    // almost always what was meant.
    const previous = previousFor(block, set);
    let weight = parseNum(weightInput.value);
    let reps = parseNum(repsInput.value);

    if (weight === null && previous) weight = previous.weight;
    if (reps === null && previous) reps = previous.reps;

    if (reps === null || reps <= 0) {
      repsInput.focus();
      toast('Inserisci le ripetizioni per registrare la serie', { variant: 'err' });
      return;
    }
    if (weight === null) weight = 0;

    weightInput.value = num(weight);
    repsInput.value = num(reps);

    const completedAt = new Date().toISOString();
    commit(
      updateSet(active(), blockId, setId, { weight, reps, done: true, completedAt }),
      { immediate: true },
    );

    row.classList.add('is-done');
    row.querySelector('.set-check').setAttribute('aria-pressed', 'true');
    updateCardState(row.closest('.ex'), blockId);
    syncStats();
    tapFeedback(state.settings.vibration);

    if (state.settings.autoRest && block.restSeconds > 0) {
      startRest(block.restSeconds, block.name, {
        sound: state.settings.sound,
        vibration: state.settings.vibration,
      });
    }

    const broken = await registerSetForRecords({
      exerciseId: block.exerciseId,
      name: block.name,
      weight,
      reps,
      type: set.type,
      at: completedAt,
    });

    if (broken.length) {
      // The record is flagged on the set, not just the node, so the
      // highlight survives a re-render of the card.
      commit(updateSet(active(), blockId, setId, { pr: true }));
      celebrate(row, block.name, broken, weight, reps);
    }
  }

  function celebrate(row, exerciseName, broken, weight, reps) {
    row.classList.add('is-pr', 'pr-flash');
    setTimeout(() => row.classList.remove('pr-flash'), 1100);

    // One message even when several bests fall at once: a top load usually
    // drags 1RM and volume along with it.
    const headline = broken.some((b) => b.type === 'weight')
      ? `Nuovo massimale: ${num(weight)} kg × ${num(reps)}`
      : `${PR_LABELS[broken[0].type]}: ${num(broken[0].value)} kg`;

    toast(`${exerciseName} — ${headline}`, {
      variant: 'pr',
      iconName: 'trophy',
      duration: 4200,
    });
  }

  function deleteSet(blockId, setId) {
    const block = blockById(blockId);
    if (!block) return;

    if (block.sets.length <= 1) {
      // The last row cannot be deleted: a card with no sets is meaningless,
      // and "remove exercise" already covers clearing it out.
      refreshCard(blockId);
      toast('Usa il menu per rimuovere l’esercizio', { variant: 'default' });
      return;
    }

    commit(removeSet(active(), blockId, setId));
    tapFeedback(state.settings.vibration);
    refreshCard(blockId);
  }

  function updateCardState(card, blockId) {
    const block = blockById(blockId);
    if (!card || !block) return;
    const allDone = block.sets.length > 0 && block.sets.every((s) => s.done);
    card.classList.toggle('is-complete', allDone);
    const meta = card.querySelector('.ex__meta');
    if (meta) meta.textContent = exerciseMeta(block);
  }

  function syncStats() {
    const workout = active();
    if (!workout) return;
    const summary = summarizeWorkout(workout);
    timeEl.textContent = clock(Date.now() - new Date(workout.startedAt).getTime());
    volumeEl.textContent = compactKg(summary.volume);
    setsEl.textContent = String(summary.sets);
  }

  /* ------------------------------------------------------------------ menu */

  async function addExerciseFlow() {
    const chosen = await pickExercises({ multiple: true });
    if (!chosen.length) return;

    commit(
      addExercises(
        active(),
        chosen.map((item) => ({
          id: item.id,
          name: item.name,
          restSeconds: item.restSeconds ?? state.settings.defaultRest,
        })),
      ),
      { immediate: true },
    );

    renderList();
    syncStats();

    raf(() => {
      const cards = listEl.querySelectorAll('.ex');
      cards[cards.length - chosen.length]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function openExerciseMenu(blockId) {
    const block = blockById(blockId);
    if (!block) return;

    openMenu(block.name, [
      {
        label: 'Calcolatore dischi',
        iconName: 'calculator',
        onClick: () => {
          const last = [...block.sets].reverse().find((s) => parseNum(s.weight));
          openPlateCalculator({ targetWeight: parseNum(last?.weight) ?? 60 });
        },
      },
      {
        label: block.notes ? 'Modifica nota' : 'Aggiungi nota',
        iconName: 'note',
        onClick: async () => {
          const notes = await promptSheet({
            title: 'Nota esercizio',
            label: 'Promemoria per la prossima volta',
            value: block.notes,
            placeholder: 'Es. presa larga, fermo di 1s in basso',
            multiline: true,
          });
          if (notes === null) return;
          commit(updateExercise(active(), blockId, { notes }), { immediate: true });
          refreshCard(blockId);
        },
      },
      {
        label: 'Tempo di recupero',
        iconName: 'timer',
        onClick: () => openRestPicker(blockId),
      },
      {
        label: 'Sposta su',
        iconName: 'up',
        onClick: () => {
          commit(moveExercise(active(), blockId, -1), { immediate: true });
          renderList();
        },
      },
      {
        label: 'Sposta giù',
        iconName: 'down',
        onClick: () => {
          commit(moveExercise(active(), blockId, 1), { immediate: true });
          renderList();
        },
      },
      {
        label: 'Rimuovi esercizio',
        iconName: 'trash',
        danger: true,
        onClick: async () => {
          const ok = await confirmSheet({
            title: 'Rimuovere l’esercizio?',
            message: `"${block.name}" e le sue serie verranno tolti da questo allenamento.`,
            confirmLabel: 'Rimuovi',
            danger: true,
          });
          if (!ok) return;
          commit(removeExercise(active(), blockId), { immediate: true });
          renderList();
          syncStats();
        },
      },
    ]);
  }

  function openRestPicker(blockId) {
    const block = blockById(blockId);
    const options = [0, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];

    const handle = openSheet({
      title: 'Tempo di recupero',
      body: () =>
        h(
          'div',
          { class: 'col col--tight' },
          h('p', { class: 'tiny' }, `Vale per tutte le serie di "${block.name}".`),
          h(
            'div',
            { class: 'menu' },
            options.map((seconds) =>
              h(
                'button',
                {
                  type: 'button',
                  class: 'menu__item',
                  onClick: () => {
                    commit(updateExercise(active(), blockId, { restSeconds: seconds }), {
                      immediate: true,
                    });
                    refreshCard(blockId);
                    handle.close();
                  },
                },
                seconds === block.restSeconds ? icon('check') : h('span', { style: { width: '21px' } }),
                seconds === 0
                  ? 'Nessun recupero automatico'
                  : seconds >= 60
                    ? `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60}s` : ''}`
                    : `${seconds} secondi`,
              ),
            ),
          ),
        ),
    });
  }

  async function rename() {
    const name = await promptSheet({
      title: 'Nome allenamento',
      label: 'Come vuoi chiamarlo?',
      value: active()?.name || '',
      placeholder: 'Es. Push pesante',
    });
    if (!name) return;
    commit({ ...active(), name }, { immediate: true });
    ctx.refresh();
  }

  function openWorkoutMenu() {
    openMenu('Allenamento', [
      { label: 'Rinomina', iconName: 'edit', onClick: rename },
      {
        label: 'Calcolatore dischi',
        iconName: 'calculator',
        onClick: () => openPlateCalculator({}),
      },
      {
        label: 'Salva come routine',
        iconName: 'copy',
        onClick: async () => {
          const workout = active();
          if (!workout?.exercises.length) {
            toast('Aggiungi almeno un esercizio', { variant: 'err' });
            return;
          }
          const name = await promptSheet({
            title: 'Salva come routine',
            label: 'Nome della routine',
            value: workout.name,
          });
          if (!name) return;
          await saveRoutine(routineFromWorkout({ ...workout }, name));
          toast('Routine salvata', { variant: 'ok', iconName: 'check' });
        },
      },
      {
        label: 'Annulla allenamento',
        iconName: 'trash',
        danger: true,
        onClick: cancelWorkout,
      },
    ]);
  }

  async function cancelWorkout() {
    const ok = await confirmSheet({
      title: 'Annullare l’allenamento?',
      message: 'Tutte le serie registrate in questa sessione andranno perse.',
      confirmLabel: 'Annulla allenamento',
      danger: true,
    });
    if (!ok) return;

    stopRest();
    await discardActive();
    keepScreenAwake(false);
    ctx.navigate('home');
  }

  async function finish() {
    const workout = active();
    const summary = summarizeWorkout(workout);

    if (summary.sets === 0) {
      const ok = await confirmSheet({
        title: 'Nessuna serie registrata',
        message: 'Non hai completato nessuna serie. Vuoi chiudere e scartare la sessione?',
        confirmLabel: 'Scarta',
        danger: true,
      });
      if (!ok) return;
      stopRest();
      await discardActive();
      keepScreenAwake(false);
      ctx.navigate('home');
      return;
    }

    const pending = workout.exercises.reduce(
      (count, ex) => count + ex.sets.filter((s) => !s.done).length,
      0,
    );

    const ok = await confirmSheet({
      title: 'Concludere l’allenamento?',
      message: pending
        ? `${summary.sets} serie completate, ${compactKg(summary.volume)} kg di volume. Le ${pending} serie non spuntate verranno scartate.`
        : `${summary.sets} serie completate, ${compactKg(summary.volume)} kg di volume.`,
      confirmLabel: 'Concludi',
    });
    if (!ok) return;

    stopRest();
    keepScreenAwake(false);
    const result = await completeActive();

    if (result.saved) {
      const count = result.workout.exercises.length;
      toast(
        `Allenamento salvato · ${count} ${count === 1 ? 'esercizio' : 'esercizi'}, ${compactKg(summarizeWorkout(result.workout).volume)} kg`,
        { variant: 'ok', iconName: 'check', duration: 4000 },
      );
    }
    ctx.navigate('home');
  }

  return {
    node,
    destroy() {
      clearInterval(ticker);
    },
  };
}

function metric(valueEl, label, extraClass) {
  return h(
    'div',
    { class: ['wo-metric', extraClass] },
    valueEl,
    h('span', { class: 'wo-metric__k' }, label),
  );
}

/**
 * Horizontal swipe to delete a set.
 * The gesture only engages once the movement is clearly horizontal, or
 * scrolling the page vertically becomes impossible.
 */
function attachSwipeToDelete(wrap, row, onDelete) {
  const THRESHOLD = 84;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let active = false;
  let decided = false;

  row.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('input')) return;
      startX = event.clientX;
      startY = event.clientY;
      dx = 0;
      active = true;
      decided = false;
    },
    { passive: true },
  );

  row.addEventListener(
    'pointermove',
    (event) => {
      if (!active) return;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (!decided) {
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          active = false;
          return;
        }
        decided = true;
        row.style.transition = 'none';
      }

      dx = Math.min(0, deltaX);
      row.style.transform = `translateX(${dx}px)`;
    },
    { passive: true },
  );

  const release = () => {
    if (!active) return;
    active = false;
    row.style.transition = '';

    if (dx < -THRESHOLD) {
      row.style.transform = 'translateX(-100%)';
      setTimeout(onDelete, 140);
    } else {
      row.style.transform = '';
    }
  };

  row.addEventListener('pointerup', release);
  row.addEventListener('pointercancel', release);
  row.addEventListener('pointerleave', release);
}
