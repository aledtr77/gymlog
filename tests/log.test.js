import test from 'node:test';
import assert from 'node:assert/strict';

import {
  byDay,
  createEntry,
  lastSession,
  recentExercises,
  today,
  todayFor,
  volume,
} from '../src/core/log.js';

const NOW = new Date('2026-03-10T18:00:00.000Z');

const at = (iso, exerciseId, weight, reps, name = exerciseId) =>
  createEntry({ exerciseId, name, weight, reps, at: iso });

test('an entry keeps only what a set actually is', () => {
  const entry = createEntry({ exerciseId: 'panca', name: 'Panca', weight: 80, reps: 8 });
  assert.deepEqual(Object.keys(entry).sort(), ['at', 'exerciseId', 'id', 'name', 'reps', 'weight']);
});

test('non-numeric weight or reps never become NaN', () => {
  const entry = createEntry({ exerciseId: 'x', name: 'X', weight: '', reps: undefined });
  assert.equal(entry.weight, 0);
  assert.equal(entry.reps, 0);
});

/* ------------------------------------------------------------ last time -- */

test('last session ignores what you already did today', () => {
  const entries = [
    at('2026-03-10T17:00:00.000Z', 'panca', 90, 5),
    at('2026-03-03T17:00:00.000Z', 'panca', 80, 8),
  ];
  const last = lastSession(entries, 'panca', NOW);
  assert.equal(last.weight, 80, 'must show the previous session, not today');
});

test('last session is null the first time round', () => {
  assert.equal(lastSession([], 'panca', NOW), null);
});

test('last session picks the most recent earlier day', () => {
  const entries = [
    at('2026-02-01T10:00:00.000Z', 'panca', 70, 8),
    at('2026-03-05T10:00:00.000Z', 'panca', 85, 6),
    at('2026-02-20T10:00:00.000Z', 'panca', 75, 8),
  ];
  assert.equal(lastSession(entries, 'panca', NOW).weight, 85);
});

/* ---------------------------------------------------------------- today -- */

test("today's sets come back oldest first, so they read as a list", () => {
  const entries = [
    at('2026-03-10T17:30:00.000Z', 'panca', 80, 6),
    at('2026-03-10T17:00:00.000Z', 'panca', 80, 8),
    at('2026-03-10T17:15:00.000Z', 'panca', 80, 7),
  ];
  assert.deepEqual(
    todayFor(entries, 'panca', NOW).map((e) => e.reps),
    [8, 7, 6],
  );
});

test('today only covers today, and only that exercise', () => {
  const entries = [
    at('2026-03-10T17:00:00.000Z', 'panca', 80, 8),
    at('2026-03-10T17:05:00.000Z', 'squat', 100, 5),
    at('2026-03-09T17:00:00.000Z', 'panca', 80, 8),
  ];
  assert.equal(todayFor(entries, 'panca', NOW).length, 1);
  assert.equal(today(entries, NOW).length, 2);
});

/* -------------------------------------------------------------- the list -- */

test('the exercise list is ordered by what you used most recently', () => {
  const entries = [
    at('2026-03-10T17:00:00.000Z', 'squat', 100, 5),
    at('2026-03-09T17:00:00.000Z', 'panca', 80, 8),
    at('2026-03-08T17:00:00.000Z', 'stacco', 120, 3),
  ];
  assert.deepEqual(
    recentExercises(entries, NOW).map((e) => e.exerciseId),
    ['squat', 'panca', 'stacco'],
  );
});

test('each list row carries last session and how many sets today', () => {
  const entries = [
    at('2026-03-10T17:00:00.000Z', 'panca', 85, 6),
    at('2026-03-10T17:10:00.000Z', 'panca', 85, 6),
    at('2026-03-03T17:00:00.000Z', 'panca', 80, 8),
  ];
  const [row] = recentExercises(entries, NOW);
  assert.equal(row.doneToday, 2);
  assert.equal(row.last.weight, 80, 'the hint is last session, not today');
});

test('an exercise done only today still shows a usable last value', () => {
  const entries = [at('2026-03-10T17:00:00.000Z', 'panca', 85, 6)];
  const [row] = recentExercises(entries, NOW);
  assert.equal(row.last.weight, 85);
  assert.equal(row.doneToday, 1);
});

/* ------------------------------------------------------------- history -- */

test('history groups by day, newest day first, sets oldest first', () => {
  const entries = [
    at('2026-03-10T17:00:00.000Z', 'panca', 80, 8),
    at('2026-03-10T17:30:00.000Z', 'panca', 80, 6),
    at('2026-03-08T17:00:00.000Z', 'squat', 100, 5),
  ];
  const days = byDay(entries);
  assert.equal(days.length, 2);
  assert.deepEqual(days[0].entries.map((e) => e.reps), [8, 6]);
  assert.equal(days[1].entries[0].exerciseId, 'squat');
});

test('volume is kilos moved, rounded', () => {
  assert.equal(volume([at('2026-03-10T17:00:00.000Z', 'panca', 82.5, 8)]), 660);
  assert.equal(volume([]), 0);
});
