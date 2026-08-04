/**
 * Metriche di allenamento.
 * Funzioni pure: nessun accesso a DOM, storage o Date.now().
 */

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'];

/** Le serie di riscaldamento non contribuiscono al volume né ai record. */
export function isWorkingSet(set) {
  return Boolean(set) && set.type !== 'warmup';
}

export function isCountedSet(set) {
  return Boolean(set) && set.done === true && isWorkingSet(set);
}

/** Volume di una serie = carico × ripetizioni. */
export function setVolume(set) {
  const weight = Number(set?.weight) || 0;
  const reps = Number(set?.reps) || 0;
  return weight * reps;
}

/**
 * 1RM stimato con la formula di Epley: w × (1 + reps/30).
 * A 1 ripetizione restituisce il carico stesso.
 * Arrotondato a 0.5 kg, la granularità reale di una sala pesi.
 */
export function estimateOneRepMax(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return round(w, 2);
  return round(w * (1 + r / 30), 2);
}

export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/** Totali di una sessione, considerando solo le serie completate e non di riscaldamento. */
export function summarizeWorkout(workout) {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  let topWeight = 0;

  for (const exercise of workout?.exercises || []) {
    for (const set of exercise.sets || []) {
      if (!isCountedSet(set)) continue;
      volume += setVolume(set);
      sets += 1;
      reps += Number(set.reps) || 0;
      topWeight = Math.max(topWeight, Number(set.weight) || 0);
    }
  }

  return {
    volume: round(volume, 1),
    sets,
    reps,
    topWeight,
    exercises: (workout?.exercises || []).filter((ex) =>
      (ex.sets || []).some(isCountedSet),
    ).length,
    durationMs: workoutDuration(workout),
  };
}

export function workoutDuration(workout) {
  if (!workout?.startedAt) return 0;
  const end = workout.finishedAt ? new Date(workout.finishedAt) : null;
  if (!end) return 0;
  return Math.max(0, end.getTime() - new Date(workout.startedAt).getTime());
}

/**
 * Confronta una serie con il record attuale di quell'esercizio.
 * Restituisce il record aggiornato e l'elenco dei primati battuti.
 *
 * @param {object|null} current record salvato, o null se è la prima volta
 * @param {object} set  { exerciseId, name, weight, reps, at }
 */
export function evaluatePersonalRecord(current, set) {
  const weight = Number(set.weight) || 0;
  const reps = Number(set.reps) || 0;

  if (weight <= 0 || reps <= 0 || !isWorkingSet(set)) {
    return { record: current, broken: [] };
  }

  const oneRm = estimateOneRepMax(weight, reps);
  const volume = setVolume(set);
  const at = set.at || null;

  const base = current || {
    exerciseId: set.exerciseId,
    name: set.name,
    bestWeight: null,
    bestOneRm: null,
    bestVolume: null,
  };

  const broken = [];
  const record = { ...base, exerciseId: set.exerciseId, name: set.name || base.name };

  if (!base.bestWeight || weight > base.bestWeight.weight) {
    record.bestWeight = { weight, reps, at };
    broken.push({ type: 'weight', value: weight, unit: 'kg' });
  }

  if (!base.bestOneRm || oneRm > base.bestOneRm.value) {
    record.bestOneRm = { value: oneRm, weight, reps, at };
    broken.push({ type: 'oneRm', value: oneRm, unit: 'kg' });
  }

  if (!base.bestVolume || volume > base.bestVolume.value) {
    record.bestVolume = { value: volume, weight, reps, at };
    broken.push({ type: 'volume', value: volume, unit: 'kg' });
  }

  return { record, broken };
}

export const PR_LABELS = {
  weight: 'Carico massimo',
  oneRm: '1RM stimato',
  volume: 'Volume in una serie',
};

/**
 * Ricostruisce tutti i record a partire dallo storico completo.
 * Usato dopo un import o dopo la cancellazione di un allenamento,
 * quando i record incrementali non sono più affidabili.
 */
export function rebuildRecords(workouts) {
  const byExercise = new Map();
  const ordered = [...workouts].sort(
    (a, b) => new Date(a.startedAt) - new Date(b.startedAt),
  );

  for (const workout of ordered) {
    for (const exercise of workout.exercises || []) {
      for (const set of exercise.sets || []) {
        if (!isCountedSet(set)) continue;
        const key = exercise.exerciseId;
        const { record } = evaluatePersonalRecord(byExercise.get(key) || null, {
          exerciseId: key,
          name: exercise.name,
          weight: set.weight,
          reps: set.reps,
          type: set.type,
          at: set.completedAt || workout.finishedAt || workout.startedAt,
        });
        if (record) byExercise.set(key, record);
      }
    }
  }

  return [...byExercise.values()];
}

/**
 * Ultima prestazione registrata per ogni esercizio, indicizzata per id.
 * È la colonna "PRECEDENTE" della schermata di allenamento: sapere cosa hai
 * fatto l'ultima volta è l'informazione singola più utile mentre ti alleni.
 */
export function buildLastPerformance(workouts) {
  const index = new Map();
  const ordered = [...workouts].sort(
    (a, b) => new Date(a.startedAt) - new Date(b.startedAt),
  );

  for (const workout of ordered) {
    for (const exercise of workout.exercises || []) {
      const sets = (exercise.sets || []).filter(isCountedSet);
      if (!sets.length) continue;
      index.set(exercise.exerciseId, {
        at: workout.finishedAt || workout.startedAt,
        workoutId: workout.id,
        sets: sets.map((s) => ({
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          type: s.type,
          rpe: s.rpe ?? null,
        })),
      });
    }
  }

  return index;
}

/** Serie storiche per i grafici dei progressi di un singolo esercizio. */
export function exerciseProgress(workouts, exerciseId) {
  const points = [];

  for (const workout of workouts) {
    const matching = (workout.exercises || []).filter(
      (ex) => ex.exerciseId === exerciseId,
    );
    if (!matching.length) continue;

    let bestOneRm = 0;
    let bestWeight = 0;
    let volume = 0;

    for (const exercise of matching) {
      for (const set of exercise.sets || []) {
        if (!isCountedSet(set)) continue;
        bestOneRm = Math.max(bestOneRm, estimateOneRepMax(set.weight, set.reps));
        bestWeight = Math.max(bestWeight, Number(set.weight) || 0);
        volume += setVolume(set);
      }
    }

    if (bestOneRm > 0) {
      points.push({
        date: workout.finishedAt || workout.startedAt,
        oneRm: round(bestOneRm, 1),
        weight: bestWeight,
        volume: round(volume, 1),
      });
    }
  }

  return points.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** Volume aggregato per gruppo muscolare in una finestra temporale. */
export function volumeByMuscle(workouts, resolveMuscle) {
  const totals = new Map();

  for (const workout of workouts) {
    for (const exercise of workout.exercises || []) {
      const muscle = resolveMuscle(exercise.exerciseId) || 'Altro';
      let volume = 0;
      for (const set of exercise.sets || []) {
        if (isCountedSet(set)) volume += setVolume(set);
      }
      if (volume > 0) totals.set(muscle, (totals.get(muscle) || 0) + volume);
    }
  }

  return [...totals.entries()]
    .map(([muscle, volume]) => ({ muscle, volume: round(volume, 1) }))
    .sort((a, b) => b.volume - a.volume);
}
