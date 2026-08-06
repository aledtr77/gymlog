import test from 'node:test';
import assert from 'node:assert/strict';

import {
  targetFor, buildSession, stepFor, volume, oneRepMax,
  personalBests, weeklyVolume, streak, isTimed,
} from '../src/core/training.js';
import { TEMPLATES, nextSession, templateById } from '../src/data/programs.js';

const NOW = new Date('2026-03-10T18:00:00.000Z');
const FB = templateById('full-body');
const SQUAT = FB.sessions[0].lifts[0];

const set = (iso, exerciseId, weight, reps) => ({
  id: `${iso}-${exerciseId}-${reps}`, at: iso, exerciseId, name: exerciseId, weight, reps,
});

/* ------------------------------------------------------------- programmes */

test('every template ships complete lifts', () => {
  for (const t of TEMPLATES) {
    assert.ok(t.sessions.length >= 2, t.name);
    for (const s of t.sessions) {
      assert.ok(s.lifts.length >= 5, `${t.name}/${s.name}`);
      for (const l of s.lifts) {
        assert.ok(l.sets > 0 && l.reps > 0 && typeof l.start === 'number' && l.rest > 0, l.name);
      }
    }
  }
});

test('sessions rotate and wrap round', () => {
  assert.equal(nextSession(FB, null).id, 'fb-a');
  assert.equal(nextSession(FB, 'fb-a').id, 'fb-b');
  assert.equal(nextSession(FB, 'fb-b').id, 'fb-a');
});

/* -------------------------------------------------------------- progression */

test('first time: the shipped starting load, and it says why', () => {
  const t = targetFor([], SQUAT, NOW);
  assert.equal(t.weight, SQUAT.start);
  assert.equal(t.status, 'start');
  assert.match(t.why, /First time/);
});

test('clearing every set earns the increment', () => {
  const past = [
    set('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    set('2026-03-08T10:05:00.000Z', 'squat', 40, 8),
    set('2026-03-08T10:10:00.000Z', 'squat', 40, 8),
  ];
  const t = targetFor(past, SQUAT, NOW);
  assert.equal(t.status, 'up');
  assert.ok(t.weight > 40);
});

test('falling short holds the load', () => {
  const past = [
    set('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    set('2026-03-08T10:05:00.000Z', 'squat', 40, 5),
    set('2026-03-08T10:10:00.000Z', 'squat', 40, 8),
  ];
  assert.equal(targetFor(past, SQUAT, NOW).status, 'hold');
});

test("today's work never feeds today's target", () => {
  const past = [
    set('2026-03-10T09:00:00.000Z', 'squat', 90, 8),
    set('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    set('2026-03-08T10:05:00.000Z', 'squat', 40, 8),
    set('2026-03-08T10:10:00.000Z', 'squat', 40, 8),
  ];
  assert.ok(targetFor(past, SQUAT, NOW).weight < 50);
});

test('a heavier lift steps in bigger jumps than a light one', () => {
  assert.ok(stepFor({ exerciseId: 'squat', start: 70 }) > stepFor({ exerciseId: 'curl', start: 10 }));
  assert.equal(stepFor({ exerciseId: 'plank', start: 0 }), 5);
  assert.ok(isTimed('plank'));
});

/* ----------------------------------------------------------------- session */

test('a fresh install builds a full session with nothing done', () => {
  const s = buildSession(FB.sessions[0], [], NOW);
  assert.equal(s.setsDone, 0);
  assert.equal(s.complete, false);
  assert.equal(s.nextIndex, 0);
  assert.ok(s.setsTotal >= 15);
});

test('completing every set completes the session', () => {
  const sets = FB.sessions[0].lifts.flatMap((l) =>
    Array.from({ length: l.sets }, (_, i) =>
      set(`2026-03-10T09:0${i}:00.000Z`, l.exerciseId, l.start, l.reps),
    ),
  );
  const s = buildSession(FB.sessions[0], sets, NOW);
  assert.equal(s.complete, true);
  assert.equal(s.setsDone, s.setsTotal);
});

/* --------------------------------------------------------------- analytics */

test('volume is kilos moved', () => {
  assert.equal(volume([set('x', 'a', 82.5, 8)]), 660);
  assert.equal(volume([]), 0);
});

test('1RM: one rep is the load itself, more reps estimate higher', () => {
  assert.equal(oneRepMax(100, 1), 100);
  assert.ok(oneRepMax(100, 5) > 100);
  assert.equal(oneRepMax(0, 5), 0);
});

test('personal bests rank by estimated 1RM', () => {
  const bests = personalBests([set('x', 'a', 100, 1), set('y', 'b', 60, 10)]);
  assert.equal(bests[0].exerciseId, 'a');
});

test('weekly volume returns one bucket per week, oldest first', () => {
  const weeks = weeklyVolume([set('2026-03-09T10:00:00.000Z', 'a', 100, 5)], 4, NOW);
  assert.equal(weeks.length, 4);
  assert.ok(weeks.at(-1).volume > 0);
});

test('streak counts consecutive days back from today', () => {
  const sets = [
    set('2026-03-10T10:00:00.000Z', 'a', 50, 5),
    set('2026-03-09T10:00:00.000Z', 'a', 50, 5),
    set('2026-03-07T10:00:00.000Z', 'a', 50, 5),
  ];
  assert.equal(streak(sets, NOW), 2);
  assert.equal(streak([], NOW), 0);
});
