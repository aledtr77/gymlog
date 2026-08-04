/**
 * Modello della sessione di allenamento.
 * Le funzioni restituiscono sempre nuovi oggetti: lo stato è immutabile,
 * così il salvataggio su IndexedDB non può mai catturare una via di mezzo.
 */

import { isCountedSet, setVolume, round } from './metrics.js';

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkout({ name = 'Allenamento libero', routineId = null, startedAt } = {}) {
  return {
    id: uid(),
    name,
    routineId,
    startedAt: startedAt || new Date().toISOString(),
    finishedAt: null,
    status: 'active',
    notes: '',
    exercises: [],
  };
}

export function createExerciseBlock({ exerciseId, name, restSeconds = 90, sets = [] }) {
  return {
    id: uid(),
    exerciseId,
    name,
    restSeconds,
    notes: '',
    sets: sets.length ? sets : [createSet()],
  };
}

export function createSet({ type = 'normal', weight = '', reps = '', rpe = null } = {}) {
  return {
    id: uid(),
    type,
    weight,
    reps,
    rpe,
    done: false,
    completedAt: null,
  };
}

/** Costruisce una sessione a partire da una routine salvata. */
export function workoutFromRoutine(routine, startedAt) {
  const workout = createWorkout({
    name: routine.name,
    routineId: routine.id,
    startedAt,
  });

  workout.exercises = (routine.exercises || []).map((item) =>
    createExerciseBlock({
      exerciseId: item.exerciseId,
      name: item.name,
      restSeconds: item.restSeconds ?? 90,
      sets: Array.from({ length: Math.max(1, item.sets || 3) }, () =>
        createSet({ reps: item.reps ?? '' }),
      ),
    }),
  );

  return workout;
}

/* -------------------------------------------------------------------------
   Mutazioni
   ------------------------------------------------------------------------- */

export function updateExercise(workout, exerciseBlockId, patch) {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) =>
      ex.id === exerciseBlockId ? { ...ex, ...patch } : ex,
    ),
  };
}

export function updateSet(workout, exerciseBlockId, setId, patch) {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) => {
      if (ex.id !== exerciseBlockId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
      };
    }),
  };
}

export function addSet(workout, exerciseBlockId) {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) => {
      if (ex.id !== exerciseBlockId) return ex;
      // La nuova serie eredita i valori dell'ultima: in genere si ripete lo
      // stesso carico, e pre-compilare risparmia due tap per serie.
      const last = [...ex.sets].reverse().find((s) => s.type !== 'warmup') || ex.sets.at(-1);
      return {
        ...ex,
        sets: [
          ...ex.sets,
          createSet({ weight: last?.weight ?? '', reps: last?.reps ?? '', rpe: last?.rpe ?? null }),
        ],
      };
    }),
  };
}

export function removeSet(workout, exerciseBlockId, setId) {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) =>
      ex.id === exerciseBlockId
        ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
        : ex,
    ),
  };
}

export function addExercises(workout, entries) {
  return {
    ...workout,
    exercises: [
      ...workout.exercises,
      ...entries.map((entry) =>
        createExerciseBlock({
          exerciseId: entry.id,
          name: entry.name,
          restSeconds: entry.restSeconds ?? 90,
        }),
      ),
    ],
  };
}

export function removeExercise(workout, exerciseBlockId) {
  return {
    ...workout,
    exercises: workout.exercises.filter((ex) => ex.id !== exerciseBlockId),
  };
}

export function moveExercise(workout, exerciseBlockId, delta) {
  const index = workout.exercises.findIndex((ex) => ex.id === exerciseBlockId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= workout.exercises.length) return workout;

  const exercises = [...workout.exercises];
  const [moved] = exercises.splice(index, 1);
  exercises.splice(target, 0, moved);
  return { ...workout, exercises };
}

/** Chiude la sessione scartando le serie mai completate. */
export function finishWorkout(workout, finishedAt = new Date().toISOString()) {
  const exercises = workout.exercises
    .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done) }))
    .filter((ex) => ex.sets.length > 0);

  return { ...workout, exercises, finishedAt, status: 'completed' };
}

/** Una sessione senza nemmeno una serie completata non vale la pena salvarla. */
export function hasLoggedSets(workout) {
  return (workout?.exercises || []).some((ex) => (ex.sets || []).some((s) => s.done));
}

/** Trasforma una sessione conclusa in una routine riutilizzabile. */
export function routineFromWorkout(workout, name) {
  return {
    id: uid(),
    name: name || workout.name,
    custom: true,
    createdAt: new Date().toISOString(),
    exercises: workout.exercises.map((ex) => {
      const counted = ex.sets.filter(isCountedSet);
      const reps = counted.length
        ? Math.round(counted.reduce((sum, s) => sum + (Number(s.reps) || 0), 0) / counted.length)
        : '';
      return {
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: Math.max(1, counted.length),
        reps,
        restSeconds: ex.restSeconds ?? 90,
      };
    }),
  };
}

/** Volume progressivo di un singolo esercizio nella sessione corrente. */
export function exerciseVolume(exerciseBlock) {
  let volume = 0;
  for (const set of exerciseBlock.sets || []) {
    if (isCountedSet(set)) volume += setVolume(set);
  }
  return round(volume, 1);
}
