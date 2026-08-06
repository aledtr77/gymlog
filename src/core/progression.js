/**
 * Progression engine — the part that makes this a training tool rather than
 * a notebook.
 *
 * A log records what happened. A training tool answers the only question you
 * actually have between sets: "what do I put on the bar now?". That answer
 * comes from double progression, the scheme almost every intermediate
 * programme runs on:
 *
 *   1. Work in a rep range (say 6-8) at a fixed load.
 *   2. When every working set reaches the top of the range, add the smallest
 *      useful increment and drop back to the bottom of the range.
 *   3. If you stall twice at the same load, deload ~10% and climb again.
 *
 * It is deliberately conservative. An engine that pushes harder than the
 * lifter recovers is worse than no engine, because the lifter stops trusting
 * it and goes back to guessing.
 */

import { round } from './metrics.js';

/**
 * Smallest load step that is actually loadable, per equipment class.
 * A barbell moves in 2 x 1.25 kg; dumbbells come in fixed jumps and pretending
 * otherwise produces targets nobody can rack.
 */
const INCREMENTS = {
  Bilanciere: 2.5,
  Manubri: 2,
  Cavi: 2.5,
  Macchina: 2.5,
  Kettlebell: 4,
  Elastico: 2.5,
  'Corpo libero': 2.5,
  Altro: 2.5,
};

/** Lower-body compounds tolerate bigger jumps than upper-body isolation. */
const BIG_JUMP_MUSCLES = new Set(['Quadricipiti', 'Femorali', 'Glutei', 'Dorso']);

export const DEFAULT_REP_RANGE = { min: 6, max: 8 };
export const STALL_LIMIT = 2;
export const DELOAD_FACTOR = 0.9;

/** Exercises measured in seconds rather than reps (planks, holds, carries). */
export const TIME_BASED = new Set(['plank', 'plank-laterale', 'hollow-hold', 'farmer-walk']);

export function isTimeBased(exerciseId) {
  return TIME_BASED.has(exerciseId);
}

/**
 * The load step for one exercise. Bodyweight movements have no meaningful
 * step: you add reps, not kilos.
 */
export function loadIncrement(exercise) {
  if (!exercise) return 2.5;
  const base = INCREMENTS[exercise.equipment] ?? 2.5;
  return BIG_JUMP_MUSCLES.has(exercise.muscle) ? base * 2 : base;
}

/**
 * Rep range for a routine entry. A routine stores a single rep target; we
 * read it as the top of a range, because that is how people actually use it
 * ("4x6" means "get 6 on all four, then go up").
 */
export function repRange(target) {
  const top = Number(target);
  if (!Number.isFinite(top) || top <= 0) return { ...DEFAULT_REP_RANGE };
  return { min: Math.max(1, top - 2), max: top };
}

/**
 * Reads one exercise's last session and decides what to do next.
 *
 * @param {object|null} last  entry from the lastPerformance index:
 *                            { sets: [{weight, reps, type}], at }
 * @param {object} options    { exercise, repTarget, stalls }
 * @returns {{
 *   status: 'first'|'advance'|'hold'|'deload',
 *   weight: number|null, reps: number, range: {min:number,max:number},
 *   reason: string
 * }}
 */
export function nextTarget(last, { exercise = null, repTarget, stalls = 0 } = {}) {
  const range = repRange(repTarget);
  const working = (last?.sets || []).filter((s) => s.type !== 'warmup');

  // Nothing to go on: the first session is for finding a working load, and
  // the app should say so rather than invent a number.
  if (!working.length) {
    return {
      status: 'first',
      weight: null,
      reps: range.max,
      range,
      reason: 'Prima volta su questo esercizio: scegli un carico che ti lasci due ripetizioni di margine.',
    };
  }

  const load = Math.max(...working.map((s) => Number(s.weight) || 0));
  const atLoad = working.filter((s) => (Number(s.weight) || 0) >= load - 1e-6);
  const minReps = Math.min(...atLoad.map((s) => Number(s.reps) || 0));
  const step = loadIncrement(exercise);

  // Every working set hit the top of the range: earn the increment.
  if (minReps >= range.max) {
    return {
      status: 'advance',
      weight: round(load + step, 2),
      reps: range.min,
      range,
      reason: `Hai chiuso tutte le serie a ${range.max}: sali di ${round(step, 2)} kg e riparti da ${range.min}.`,
    };
  }

  // Stalled repeatedly at the same load: back off and rebuild.
  if (stalls >= STALL_LIMIT) {
    return {
      status: 'deload',
      weight: round(load * DELOAD_FACTOR, 2),
      reps: range.min,
      range,
      reason: `Fermo da ${stalls} sedute su ${round(load, 2)} kg: scarica del 10% e risali.`,
    };
  }

  // Still climbing inside the range: same load, one more rep.
  return {
    status: 'hold',
    weight: round(load, 2),
    reps: Math.min(range.max, minReps + 1),
    range,
    reason: `Resta su ${round(load, 2)} kg finché non chiudi ${range.max} su tutte le serie.`,
  };
}

/**
 * Counts how many consecutive past sessions failed to progress the load on
 * this exercise. Feeds the deload branch above.
 */
export function countStalls(workouts, exerciseId) {
  const loads = [];

  for (const workout of [...workouts].sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
  )) {
    for (const block of workout.exercises || []) {
      if (block.exerciseId !== exerciseId) continue;
      const working = (block.sets || []).filter((s) => s.done && s.type !== 'warmup');
      if (working.length) loads.push(Math.max(...working.map((s) => Number(s.weight) || 0)));
    }
  }

  if (loads.length < 2) return 0;

  let stalls = 0;
  for (let i = 1; i < loads.length; i += 1) {
    if (loads[i] >= loads[0] - 1e-6) stalls += 1;
    else break;
  }
  return stalls;
}

/**
 * Warm-up ramp for a working load.
 *
 * Percentages are the conventional ones: enough to prime the pattern and the
 * joints without eating into the working sets. Skipped entirely for light
 * loads, where a ramp costs more fatigue than it saves.
 */
export function warmupRamp(workingWeight, { barWeight = 20, exercise = null } = {}) {
  const target = Number(workingWeight) || 0;
  if (target <= 0) return [];

  // Below roughly 1.5x the empty bar there is nothing to ramp into.
  if (target < barWeight * 1.5) return [];

  const isolation = !BIG_JUMP_MUSCLES.has(exercise?.muscle) && target < barWeight * 3;
  const steps = isolation
    ? [{ pct: 0.5, reps: 8 }, { pct: 0.75, reps: 5 }]
    : [{ pct: 0.4, reps: 8 }, { pct: 0.6, reps: 5 }, { pct: 0.8, reps: 3 }];

  return steps.map(({ pct, reps }) => ({
    weight: roundToStep(target * pct, barWeight),
    reps,
    type: 'warmup',
  }));
}

/** Warm-up loads only need to be roughly right, but they must be loadable. */
function roundToStep(value, barWeight) {
  const step = 2.5;
  const rounded = Math.round(value / step) * step;
  return round(Math.max(barWeight, rounded), 2);
}
