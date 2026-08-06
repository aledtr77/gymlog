/**
 * Home.
 * Answers exactly one question: "what am I training today?". The week at a
 * glance up top, then the button to start, then the routines.
 */

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { confirmSheet, openMenu, promptSheet } from '../sheet.js';
import { toast } from '../toast.js';
import { pickExercises } from '../exercisePicker.js';
import { openRoutineEditor } from './routineEditor.js';
import {
  deleteRoutine,
  saveRoutine,
  setActive,
  state,
} from '../../core/store.js';
import { createWorkout, uid, workoutFromRoutine } from '../../core/workout.js';
import { summarizeWorkout } from '../../core/metrics.js';
import {
  WEEKDAY_INITIALS,
  compactKg,
  greeting,
  relativeDay,
  startOfWeek,
} from '../../core/format.js';

export function homeView(ctx) {
  const node = h('div', null, appbar(), h('main', { class: 'main' }, h('div', { class: 'view' }, ...sections())));
  return { node };

  function appbar() {
    return h(
      'header',
      { class: 'appbar appbar--brand' },
      h(
        'div',
        { class: 'appbar__inner' },
        h(
          'div',
          { class: 'brand' },
          h('span', { class: 'brand__mark' }, 'G'),
          h('span', { class: 'brand__name' }, 'GymLog'),
        ),
      ),
    );
  }

  function sections() {
    return [hero(), routines(), recent()];
  }

  /* ------------------------------------------------------------------ hero */

  function hero() {
    const completed = state.workouts.filter((w) => w.status === 'completed');
    const weekStart = startOfWeek(new Date());
    const thisWeek = completed.filter((w) => new Date(w.startedAt) >= weekStart);
    const weekVolume = thisWeek.reduce((sum, w) => sum + summarizeWorkout(w).volume, 0);

    const trainedDays = new Set(
      thisWeek.map((w) => (new Date(w.startedAt).getDay() + 6) % 7),
    );
    const todayIndex = (new Date().getDay() + 6) % 7;

    return h(
      'section',
      { class: 'hero' },
      h('span', { class: 'hero__greet' }, greeting()),
      h(
        'h1',
        { class: 'hero__title' },
        thisWeek.length
          ? `${thisWeek.length} ${thisWeek.length === 1 ? 'allenamento' : 'allenamenti'} questa settimana`
          : 'Pronto ad allenarti?',
      ),
      h(
        'div',
        { class: 'week-dots' },
        WEEKDAY_INITIALS.map((initial, index) =>
          h(
            'span',
            {
              class: [
                'week-dot',
                trainedDays.has(index) && 'is-done',
                index === todayIndex && 'is-today',
              ],
              'aria-label': trainedDays.has(index) ? 'Giorno allenato' : 'Giorno di riposo',
            },
            initial,
          ),
        ),
      ),
      h(
        'div',
        { class: 'stats' },
        stat(compactKg(weekVolume), 'kg', 'Volume'),
        stat(String(thisWeek.length), '', 'Sessioni'),
        stat(
          String(thisWeek.reduce((sum, w) => sum + summarizeWorkout(w).sets, 0)),
          '',
          'Serie',
        ),
      ),
      h(
        'button',
        { type: 'button', class: 'btn btn--primary btn--lg btn--block', onClick: startEmpty },
        icon('play'),
        'Inizia allenamento libero',
      ),
    );
  }

  function stat(value, unit, label) {
    return h(
      'div',
      { class: 'stat' },
      h(
        'span',
        { class: 'stat__value' },
        value,
        unit ? h('span', { class: 'stat__unit' }, unit) : null,
      ),
      h('span', { class: 'stat__label' }, label),
    );
  }

  /* ------------------------------------------------------------- routines */

  function routines() {
    return h(
      'section',
      { class: 'col col--tight' },
      h(
        'div',
        { class: 'section-title' },
        h('h2', null, 'Le tue routine'),
        h(
          'button',
          { type: 'button', class: 'btn btn--quiet btn--sm', onClick: createRoutine },
          icon('plus'),
          'Nuova',
        ),
      ),
      state.routines.length
        ? h('div', { class: 'list-grid' }, state.routines.map(routineCard))
        : h(
            'div',
            { class: 'card' },
            h(
              'div',
              { class: 'empty' },
              h('div', { class: 'empty__icon' }, icon('list')),
              h('h3', null, 'Nessuna routine'),
              h('p', null, 'Crea una scheda per iniziare l’allenamento con un tocco.'),
            ),
          ),
    );
  }

  function routineCard(routine) {
    const count = routine.exercises?.length || 0;
    const preview = (routine.exercises || [])
      .slice(0, 3)
      .map((e) => e.name)
      .join(' · ');

    return h(
      'div',
      { class: 'routine' },
      h(
        'button',
        {
          type: 'button',
          class: 'routine__body',
          style: { background: 'none', border: 0, padding: 0, textAlign: 'left' },
          onClick: () => startRoutine(routine),
        },
        h('span', { class: 'routine__name' }, routine.name),
        h(
          'span',
          { class: 'routine__meta' },
          count ? `${count} esercizi · ${preview}` : 'Scheda vuota',
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'icon-btn',
          'aria-label': `Opzioni ${routine.name}`,
          onClick: () => routineMenu(routine),
        },
        icon('more'),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'routine__go',
          'aria-label': `Inizia ${routine.name}`,
          onClick: () => startRoutine(routine),
        },
        icon('play'),
      ),
    );
  }

  function routineMenu(routine) {
    openMenu(routine.name, [
      { label: 'Inizia questa routine', iconName: 'play', onClick: () => startRoutine(routine) },
      {
        label: 'Modifica',
        iconName: 'edit',
        onClick: () => openRoutineEditor(routine, () => ctx.refresh()),
      },
      {
        label: 'Duplica',
        iconName: 'copy',
        onClick: async () => {
          await saveRoutine({
            ...routine,
            id: uid(),
            name: `${routine.name} (copia)`,
            createdAt: new Date().toISOString(),
          });
          ctx.refresh();
        },
      },
      {
        label: 'Elimina',
        iconName: 'trash',
        danger: true,
        onClick: async () => {
          const ok = await confirmSheet({
            title: 'Eliminare la routine?',
            message: `"${routine.name}" verrà rimossa. Gli allenamenti già registrati restano nello storico.`,
            confirmLabel: 'Elimina',
            danger: true,
          });
          if (!ok) return;
          await deleteRoutine(routine.id);
          ctx.refresh();
        },
      },
    ]);
  }

  async function createRoutine() {
    const name = await promptSheet({
      title: 'Nuova routine',
      label: 'Nome',
      placeholder: 'Es. Push A',
      confirmLabel: 'Continua',
    });
    if (!name) return;

    const chosen = await pickExercises({ multiple: true, title: 'Scegli gli esercizi' });
    const routine = {
      id: uid(),
      name,
      description: '',
      createdAt: new Date().toISOString(),
      exercises: chosen.map((item) => ({
        exerciseId: item.id,
        name: item.name,
        sets: 3,
        reps: 10,
        restSeconds: item.restSeconds ?? state.settings.defaultRest,
      })),
    };

    await saveRoutine(routine);
    ctx.refresh();
    toast('Routine creata', { variant: 'ok', iconName: 'check' });
  }

  /* ---------------------------------------------------------------- recent */

  function recent() {
    const completed = state.workouts.filter((w) => w.status === 'completed').slice(0, 3);
    if (!completed.length) return null;

    return h(
      'section',
      { class: 'col col--tight' },
      h(
        'div',
        { class: 'section-title' },
        h('h2', null, 'Ultimi allenamenti'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--quiet btn--sm',
            onClick: () => ctx.navigate('history'),
          },
          'Vedi tutti',
        ),
      ),
      h(
        'div',
        { class: 'list-grid' },
        completed.map((workout) => {
          const summary = summarizeWorkout(workout);
          return h(
            'div',
            { class: 'routine' },
            h(
              'div',
              { class: 'routine__body' },
              h('span', { class: 'routine__name' }, workout.name),
              h(
                'span',
                { class: 'routine__meta' },
                `${relativeDay(workout.startedAt)} · ${summary.sets} serie · ${compactKg(summary.volume)} kg`,
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                class: 'btn btn--ghost btn--sm',
                onClick: () => repeatWorkout(workout),
              },
              'Ripeti',
            ),
          );
        }),
      ),
    );
  }

  /* -------------------------------------------------------------- starting */

  async function startEmpty() {
    if (!(await confirmReplaceActive())) return;
    await setActive(createWorkout({}), { immediate: true });
    ctx.navigate('workout');
  }

  async function startRoutine(routine) {
    if (!(await confirmReplaceActive())) return;
    await setActive(workoutFromRoutine(routine, new Date().toISOString()), { immediate: true });
    ctx.navigate('workout');
  }

  async function repeatWorkout(workout) {
    if (!(await confirmReplaceActive())) return;

    const next = createWorkout({ name: workout.name, routineId: workout.routineId });
    next.exercises = workout.exercises.map((ex) => ({
      id: uid(),
      exerciseId: ex.exerciseId,
      name: ex.name,
      restSeconds: ex.restSeconds ?? state.settings.defaultRest,
      notes: ex.notes || '',
      sets: ex.sets.map(() => ({
        id: uid(),
        type: 'normal',
        weight: '',
        reps: '',
        rpe: null,
        done: false,
        completedAt: null,
      })),
    }));

    await setActive(next, { immediate: true });
    ctx.navigate('workout');
  }

  async function confirmReplaceActive() {
    if (!state.active) return true;
    return confirmSheet({
      title: 'C’è già un allenamento in corso',
      message: 'Aprendone uno nuovo quello attuale verrà scartato.',
      confirmLabel: 'Scarta e continua',
      danger: true,
    });
  }
}
