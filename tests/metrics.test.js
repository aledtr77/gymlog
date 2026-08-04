import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLastPerformance,
  estimateOneRepMax,
  evaluatePersonalRecord,
  exerciseProgress,
  isCountedSet,
  rebuildRecords,
  summarizeWorkout,
  volumeByMuscle,
} from '../src/core/metrics.js';

/* ------------------------------------------------------------------- 1RM */

test('1RM: a una ripetizione coincide col carico', () => {
  assert.equal(estimateOneRepMax(100, 1), 100);
});

test('1RM: formula di Epley', () => {
  assert.equal(estimateOneRepMax(100, 5), 116.67);
  assert.equal(estimateOneRepMax(100, 12), 140);
  assert.equal(estimateOneRepMax(80, 8), 101.33);
});

test('1RM: valori non validi danno zero invece di NaN', () => {
  assert.equal(estimateOneRepMax(0, 5), 0);
  assert.equal(estimateOneRepMax(100, 0), 0);
  assert.equal(estimateOneRepMax('', ''), 0);
  assert.equal(estimateOneRepMax(-50, 5), 0);
});

test('1RM: cresce al crescere delle ripetizioni', () => {
  const values = [1, 3, 5, 8, 12].map((reps) => estimateOneRepMax(100, reps));
  const sorted = [...values].sort((a, b) => a - b);
  assert.deepEqual(values, sorted);
});

/* --------------------------------------------------------------- conteggi */

test('solo le serie completate e non di riscaldamento contano', () => {
  assert.equal(isCountedSet({ done: true, type: 'normal' }), true);
  assert.equal(isCountedSet({ done: true, type: 'warmup' }), false);
  assert.equal(isCountedSet({ done: false, type: 'normal' }), false);
  assert.equal(isCountedSet({ done: true, type: 'drop' }), true);
});

test('riepilogo: il riscaldamento non gonfia il volume', () => {
  const workout = {
    startedAt: '2026-08-01T10:00:00.000Z',
    finishedAt: '2026-08-01T11:00:00.000Z',
    exercises: [
      {
        exerciseId: 'panca-piana',
        sets: [
          { type: 'warmup', weight: 40, reps: 10, done: true },
          { type: 'normal', weight: 80, reps: 8, done: true },
          { type: 'normal', weight: 80, reps: 6, done: true },
          { type: 'normal', weight: 80, reps: 6, done: false },
        ],
      },
    ],
  };

  const summary = summarizeWorkout(workout);
  assert.equal(summary.volume, 1120); // 80*8 + 80*6, senza il warmup
  assert.equal(summary.sets, 2);
  assert.equal(summary.reps, 14);
  assert.equal(summary.topWeight, 80);
  assert.equal(summary.exercises, 1);
  assert.equal(summary.durationMs, 3600000);
});

test('riepilogo: sessione vuota non lancia eccezioni', () => {
  const summary = summarizeWorkout({ startedAt: '2026-08-01T10:00:00.000Z', exercises: [] });
  assert.equal(summary.volume, 0);
  assert.equal(summary.sets, 0);
  assert.equal(summary.durationMs, 0);
});

/* ---------------------------------------------------------------- record */

test('record: la prima serie valida stabilisce tutti i primati', () => {
  const { record, broken } = evaluatePersonalRecord(null, {
    exerciseId: 'squat',
    name: 'Squat',
    weight: 100,
    reps: 5,
    type: 'normal',
    at: '2026-08-01T10:00:00.000Z',
  });

  assert.deepEqual(
    broken.map((b) => b.type).sort(),
    ['oneRm', 'volume', 'weight'],
  );
  assert.equal(record.bestWeight.weight, 100);
  assert.equal(record.bestVolume.value, 500);
});

test('record: un carico più alto con meno reps batte solo il massimale', () => {
  const first = evaluatePersonalRecord(null, {
    exerciseId: 'squat',
    name: 'Squat',
    weight: 100,
    reps: 8,
    type: 'normal',
  }).record;

  const { broken } = evaluatePersonalRecord(first, {
    exerciseId: 'squat',
    name: 'Squat',
    weight: 110,
    reps: 3,
    type: 'normal',
  });

  // 110×3 → 1RM 121 < 126,67 e volume 330 < 800: solo il carico è un primato.
  assert.deepEqual(broken.map((b) => b.type), ['weight']);
});

test('record: una serie peggiore non batte nulla', () => {
  const first = evaluatePersonalRecord(null, {
    exerciseId: 'squat',
    name: 'Squat',
    weight: 100,
    reps: 8,
    type: 'normal',
  }).record;

  const { broken, record } = evaluatePersonalRecord(first, {
    exerciseId: 'squat',
    name: 'Squat',
    weight: 90,
    reps: 6,
    type: 'normal',
  });

  assert.equal(broken.length, 0);
  assert.equal(record.bestWeight.weight, 100);
});

test('record: le serie di riscaldamento non generano primati', () => {
  const { broken, record } = evaluatePersonalRecord(null, {
    exerciseId: 'squat',
    name: 'Squat',
    weight: 200,
    reps: 10,
    type: 'warmup',
  });

  assert.equal(broken.length, 0);
  assert.equal(record, null);
});

test('record: ricostruzione dallo storico equivale al calcolo incrementale', () => {
  const workouts = [
    {
      id: 'w1',
      startedAt: '2026-07-01T10:00:00.000Z',
      exercises: [
        {
          exerciseId: 'squat',
          name: 'Squat',
          sets: [{ type: 'normal', weight: 100, reps: 5, done: true }],
        },
      ],
    },
    {
      id: 'w2',
      startedAt: '2026-07-08T10:00:00.000Z',
      exercises: [
        {
          exerciseId: 'squat',
          name: 'Squat',
          sets: [
            { type: 'normal', weight: 105, reps: 5, done: true },
            { type: 'warmup', weight: 200, reps: 1, done: true },
          ],
        },
      ],
    },
  ];

  const [record] = rebuildRecords(workouts);
  assert.equal(record.exerciseId, 'squat');
  assert.equal(record.bestWeight.weight, 105);
  assert.equal(record.bestVolume.value, 525);
});

/* --------------------------------------------------- prestazione precedente */

test('ultima prestazione: vince la sessione più recente', () => {
  const workouts = [
    {
      id: 'w2',
      startedAt: '2026-07-08T10:00:00.000Z',
      finishedAt: '2026-07-08T11:00:00.000Z',
      exercises: [
        {
          exerciseId: 'panca-piana',
          sets: [
            { type: 'normal', weight: 82.5, reps: 8, done: true },
            { type: 'normal', weight: 82.5, reps: 7, done: true },
          ],
        },
      ],
    },
    {
      id: 'w1',
      startedAt: '2026-07-01T10:00:00.000Z',
      finishedAt: '2026-07-01T11:00:00.000Z',
      exercises: [
        {
          exerciseId: 'panca-piana',
          sets: [{ type: 'normal', weight: 80, reps: 8, done: true }],
        },
      ],
    },
  ];

  const index = buildLastPerformance(workouts);
  const previous = index.get('panca-piana');

  assert.equal(previous.workoutId, 'w2');
  assert.equal(previous.sets.length, 2);
  assert.equal(previous.sets[0].weight, 82.5);
});

test('ultima prestazione: le serie non completate sono escluse', () => {
  const index = buildLastPerformance([
    {
      id: 'w1',
      startedAt: '2026-07-01T10:00:00.000Z',
      exercises: [
        {
          exerciseId: 'squat',
          sets: [
            { type: 'normal', weight: 100, reps: 5, done: true },
            { type: 'normal', weight: 100, reps: 5, done: false },
          ],
        },
      ],
    },
  ]);

  assert.equal(index.get('squat').sets.length, 1);
});

/* ------------------------------------------------------------ progressi */

test('progressi: un punto per sessione, in ordine cronologico', () => {
  const workouts = [
    {
      startedAt: '2026-07-08T10:00:00.000Z',
      exercises: [
        { exerciseId: 'squat', sets: [{ type: 'normal', weight: 110, reps: 5, done: true }] },
      ],
    },
    {
      startedAt: '2026-07-01T10:00:00.000Z',
      exercises: [
        { exerciseId: 'squat', sets: [{ type: 'normal', weight: 100, reps: 5, done: true }] },
      ],
    },
  ];

  const points = exerciseProgress(workouts, 'squat');
  assert.equal(points.length, 2);
  assert.ok(new Date(points[0].date) < new Date(points[1].date));
  assert.equal(points[0].weight, 100);
  assert.equal(points[1].weight, 110);
});

test('volume per gruppo muscolare, ordinato dal più allenato', () => {
  const workouts = [
    {
      startedAt: '2026-07-01T10:00:00.000Z',
      exercises: [
        { exerciseId: 'squat', sets: [{ type: 'normal', weight: 100, reps: 10, done: true }] },
        { exerciseId: 'curl-bil', sets: [{ type: 'normal', weight: 30, reps: 10, done: true }] },
      ],
    },
  ];

  const totals = volumeByMuscle(workouts, (id) =>
    id === 'squat' ? 'Quadricipiti' : 'Bicipiti',
  );

  assert.deepEqual(totals, [
    { muscle: 'Quadricipiti', volume: 1000 },
    { muscle: 'Bicipiti', volume: 300 },
  ]);
});
