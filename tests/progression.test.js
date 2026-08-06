import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countStalls,
  loadIncrement,
  nextTarget,
  repRange,
  warmupRamp,
} from '../src/core/progression.js';

const BARBELL_SQUAT = { id: 'squat', muscle: 'Quadricipiti', equipment: 'Bilanciere' };
const DB_CURL = { id: 'curl', muscle: 'Bicipiti', equipment: 'Manubri' };

const set = (weight, reps, type = 'normal') => ({ weight, reps, type });

/* ------------------------------------------------------------- increments */

test('increment: lower-body barbell moves in bigger jumps than dumbbell curls', () => {
  assert.equal(loadIncrement(BARBELL_SQUAT), 5);
  assert.equal(loadIncrement(DB_CURL), 2);
});

test('increment: an unknown exercise still yields a loadable step', () => {
  assert.equal(loadIncrement(null), 2.5);
  assert.equal(loadIncrement({ muscle: 'Petto', equipment: 'Sconosciuto' }), 2.5);
});

/* ------------------------------------------------------------- rep ranges */

test('rep range: a single target reads as the top of a range', () => {
  assert.deepEqual(repRange(8), { min: 6, max: 8 });
});

test('rep range: invalid targets fall back to the default', () => {
  assert.deepEqual(repRange(0), { min: 6, max: 8 });
  assert.deepEqual(repRange('boh'), { min: 6, max: 8 });
});

test('rep range: a low target never produces a minimum below one', () => {
  assert.deepEqual(repRange(1), { min: 1, max: 1 });
});

/* ---------------------------------------------------------------- targets */

test('first session: no invented weight, and it says why', () => {
  const result = nextTarget(null, { exercise: BARBELL_SQUAT, repTarget: 6 });
  assert.equal(result.status, 'first');
  assert.equal(result.weight, null);
  assert.match(result.reason, /Prima volta/);
});

test('advance: all sets at the top of the range earns the increment', () => {
  const last = { sets: [set(100, 6), set(100, 6), set(100, 6)] };
  const result = nextTarget(last, { exercise: BARBELL_SQUAT, repTarget: 6 });
  assert.equal(result.status, 'advance');
  assert.equal(result.weight, 105);
  assert.equal(result.reps, 4);
});

test('hold: one set short of the range keeps the load and asks for a rep', () => {
  const last = { sets: [set(100, 6), set(100, 5), set(100, 6)] };
  const result = nextTarget(last, { exercise: BARBELL_SQUAT, repTarget: 6 });
  assert.equal(result.status, 'hold');
  assert.equal(result.weight, 100);
  assert.equal(result.reps, 6);
});

test('warmup sets never influence the decision', () => {
  const last = { sets: [set(40, 10, 'warmup'), set(100, 6), set(100, 6)] };
  const result = nextTarget(last, { exercise: BARBELL_SQUAT, repTarget: 6 });
  assert.equal(result.status, 'advance');
  assert.equal(result.weight, 105);
});

test('a lighter back-off set does not drag the working load down', () => {
  const last = { sets: [set(100, 6), set(100, 6), set(80, 10)] };
  const result = nextTarget(last, { exercise: BARBELL_SQUAT, repTarget: 6 });
  assert.equal(result.status, 'advance');
  assert.equal(result.weight, 105);
});

test('deload: stalling at the limit backs the load off by 10%', () => {
  const last = { sets: [set(100, 5), set(100, 5)] };
  const result = nextTarget(last, { exercise: BARBELL_SQUAT, repTarget: 6, stalls: 2 });
  assert.equal(result.status, 'deload');
  assert.equal(result.weight, 90);
});

test('dumbbell progression uses the smaller step', () => {
  const last = { sets: [set(14, 8), set(14, 8), set(14, 8)] };
  const result = nextTarget(last, { exercise: DB_CURL, repTarget: 8 });
  assert.equal(result.weight, 16);
});

/* ----------------------------------------------------------------- stalls */

test('stalls: counts consecutive sessions that failed to add load', () => {
  const workout = (startedAt, weight) => ({
    startedAt,
    exercises: [
      { exerciseId: 'squat', sets: [{ weight, reps: 5, done: true, type: 'normal' }] },
    ],
  });

  const workouts = [
    workout('2026-01-01T10:00:00.000Z', 90),
    workout('2026-01-08T10:00:00.000Z', 100),
    workout('2026-01-15T10:00:00.000Z', 100),
    workout('2026-01-22T10:00:00.000Z', 100),
  ];

  assert.equal(countStalls(workouts, 'squat'), 2);
});

test('stalls: a single session cannot be a stall', () => {
  const workouts = [
    {
      startedAt: '2026-01-01T10:00:00.000Z',
      exercises: [
        { exerciseId: 'squat', sets: [{ weight: 100, reps: 5, done: true, type: 'normal' }] },
      ],
    },
  ];
  assert.equal(countStalls(workouts, 'squat'), 0);
});

test('stalls: incomplete sets are ignored', () => {
  const workouts = [
    {
      startedAt: '2026-01-01T10:00:00.000Z',
      exercises: [
        { exerciseId: 'squat', sets: [{ weight: 100, reps: 5, done: false, type: 'normal' }] },
      ],
    },
  ];
  assert.equal(countStalls(workouts, 'squat'), 0);
});

/* ---------------------------------------------------------------- warm-up */

test('warm-up: light loads get no ramp', () => {
  assert.deepEqual(warmupRamp(25, { barWeight: 20 }), []);
  assert.deepEqual(warmupRamp(0, { barWeight: 20 }), []);
});

test('warm-up: a heavy compound ramps in three loadable steps', () => {
  const ramp = warmupRamp(100, { barWeight: 20, exercise: BARBELL_SQUAT });
  assert.equal(ramp.length, 3);
  assert.deepEqual(ramp.map((s) => s.weight), [40, 60, 80]);
  assert.ok(ramp.every((s) => s.type === 'warmup'));
});

test('warm-up: steps are ordered and never below the empty bar', () => {
  const ramp = warmupRamp(60, { barWeight: 20, exercise: BARBELL_SQUAT });
  assert.ok(ramp.every((s) => s.weight >= 20));
  const weights = ramp.map((s) => s.weight);
  assert.deepEqual(weights, [...weights].sort((a, b) => a - b));
});

test('warm-up: every step lands on a loadable 2.5 kg multiple', () => {
  for (const target of [72.5, 87.5, 117.5, 142.5]) {
    for (const step of warmupRamp(target, { barWeight: 20, exercise: BARBELL_SQUAT })) {
      assert.equal(Math.round(step.weight * 10) % 25, 0, `${target} -> ${step.weight}`);
    }
  }
});
