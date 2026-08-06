/**
 * Training metrics.
 * Pure functions: no DOM, no storage, no Date.now().
 */

export const SET_TYPES = ['normal', 'warmup', 'drop', 'failure'];

/** Warmup sets count towards neither volume nor personal records. */
export function isWorkingSet(set) {
  return Boolean(set) && set.type !== 'warmup';
}

export function isCountedSet(set) {
  return Boolean(set) && set.done === true && isWorkingSet(set);
}

/** Volume of a set = load x reps. */
export function setVolume(set) {
  const weight = Number(set?.weight) || 0;
  const reps = Number(set?.reps) || 0;
  return weight * reps;
}

/**
 * Estimated 1RM via the Epley formula: w * (1 + reps/30).
 * At 1 rep it returns the load itself.
 * Rounded to 0.5 kg, the real granularity of a weights room.
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

/** Session totals, counting only completed, non-warmup sets. */
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
 * Compares a set against the current record for that exercise.
 * Returns the updated record and the list of bests that were beaten.
 *
 * @param {object|null} current stored record, or null the first time round
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
 * Rebuilds every record from the full history.
 * Used after an import or after deleting a workout, when the
 * incrementally maintained records can no longer be trusted.
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
 * Last recorded performance per exercise, indexed by id.
 * This is the "previous" column on the workout screen: knowing what you
 * did last time is the single most useful thing to see mid-session.
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

/** Time series feeding the progress charts for a single exercise. */
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

/** Volume aggregated by muscle group over a time window. */
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
