import test from 'node:test';
import assert from 'node:assert/strict';

import { createEntry } from '../src/core/log.js';
import { targetFor, todaySession, lastDayId, stepFor } from '../src/core/plan.js';
import { PROGRAM, nextDay } from '../src/data/program.js';

const NOW = new Date('2026-03-10T18:00:00.000Z');
const SQUAT = PROGRAM[0].exercises[0];

const entry = (iso, exerciseId, weight, reps, dayId = 'a') =>
  createEntry({ exerciseId, name: exerciseId, weight, reps, at: iso, dayId });

test('the plan ships with two alternating full-body days', () => {
  assert.equal(PROGRAM.length, 2);
  assert.ok(PROGRAM.every((d) => d.exercises.length >= 5));
});

test('every lift carries a starting load, sets, reps and a cue', () => {
  for (const day of PROGRAM) {
    for (const lift of day.exercises) {
      assert.ok(lift.sets > 0 && lift.reps > 0, lift.name);
      assert.ok(typeof lift.start === 'number', lift.name);
      assert.ok(lift.note && lift.note.length > 10, `${lift.name} needs a cue`);
    }
  }
});

test('days alternate, and the first session is A', () => {
  assert.equal(nextDay(null).id, 'a');
  assert.equal(nextDay('a').id, 'b');
  assert.equal(nextDay('b').id, 'a');
});

test('first time on a lift: the shipped starting load, and it says why', () => {
  const target = targetFor([], SQUAT, NOW);
  assert.equal(target.weight, SQUAT.start);
  assert.equal(target.status, 'start');
  assert.match(target.why, /Prima volta/);
});

test('all sets completed last time means the load goes up', () => {
  const past = [
    entry('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    entry('2026-03-08T10:05:00.000Z', 'squat', 40, 8),
    entry('2026-03-08T10:10:00.000Z', 'squat', 40, 8),
  ];
  const target = targetFor(past, SQUAT, NOW);
  assert.equal(target.status, 'up');
  assert.equal(target.weight, 42.5);
});

test('falling short of the reps holds the load', () => {
  const past = [
    entry('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    entry('2026-03-08T10:05:00.000Z', 'squat', 40, 6),
    entry('2026-03-08T10:10:00.000Z', 'squat', 40, 8),
  ];
  assert.equal(targetFor(past, SQUAT, NOW).status, 'same');
  assert.equal(targetFor(past, SQUAT, NOW).weight, 40);
});

test('missing a set holds the load too', () => {
  const past = [
    entry('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    entry('2026-03-08T10:05:00.000Z', 'squat', 40, 8),
  ];
  assert.equal(targetFor(past, SQUAT, NOW).status, 'same');
});

test("today's sets never influence today's target", () => {
  const past = [
    entry('2026-03-10T09:00:00.000Z', 'squat', 60, 8),
    entry('2026-03-08T10:00:00.000Z', 'squat', 40, 8),
    entry('2026-03-08T10:05:00.000Z', 'squat', 40, 8),
    entry('2026-03-08T10:10:00.000Z', 'squat', 40, 8),
  ];
  assert.equal(targetFor(past, SQUAT, NOW).weight, 42.5);
});

test('the plank steps in seconds, a barbell in 2.5 kg', () => {
  const plank = PROGRAM[0].exercises.find((e) => e.exerciseId === 'plank');
  assert.equal(stepFor(plank), 5);
  assert.equal(stepFor(SQUAT), 2.5);
});

test('a fresh install opens onto day A, nothing done, nothing complete', () => {
  const session = todaySession([], NOW);
  assert.equal(session.day.id, 'a');
  assert.equal(session.setsDone, 0);
  assert.equal(session.started, false);
  assert.equal(session.complete, false);
  assert.ok(session.setsTotal > 0);
  assert.ok(session.exercises.every((e) => e.target.weight >= 0));
});

test('after training A, the next session is B', () => {
  const done = PROGRAM[0].exercises.flatMap((lift) =>
    Array.from({ length: lift.sets }, () =>
      entry('2026-03-08T10:00:00.000Z', lift.exerciseId, lift.start, lift.reps, 'a'),
    ),
  );
  assert.equal(lastDayId(done), 'a');
  assert.equal(todaySession(done, NOW).day.id, 'b');
});

test('a session started today does not flip to the other day midway', () => {
  const started = [entry('2026-03-10T09:00:00.000Z', 'squat', 40, 8, 'a')];
  assert.equal(todaySession(started, NOW).day.id, 'a');
  assert.equal(todaySession(started, NOW).started, true);
});

test('completing every set marks the session complete', () => {
  const done = PROGRAM[0].exercises.flatMap((lift) =>
    Array.from({ length: lift.sets }, () =>
      entry('2026-03-10T09:00:00.000Z', lift.exerciseId, lift.start, lift.reps, 'a'),
    ),
  );
  const session = todaySession(done, NOW);
  assert.equal(session.complete, true);
  assert.equal(session.setsDone, session.setsTotal);
});
