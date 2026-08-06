import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addExercises,
  addSet,
  createSet,
  createWorkout,
  finishWorkout,
  hasLoggedSets,
  moveExercise,
  removeExercise,
  removeSet,
  routineFromWorkout,
  updateSet,
  workoutFromRoutine,
} from '../src/core/workout.js';

function sample() {
  let workout = createWorkout({ name: 'Test', startedAt: '2026-08-01T10:00:00.000Z' });
  workout = addExercises(workout, [
    { id: 'panca-piana', name: 'Panca piana', restSeconds: 150 },
    { id: 'squat', name: 'Squat', restSeconds: 180 },
  ]);
  return workout;
}

test('new session: active, with no exercises', () => {
  const workout = createWorkout({});
  assert.equal(workout.status, 'active');
  assert.equal(workout.finishedAt, null);
  assert.deepEqual(workout.exercises, []);
  assert.ok(workout.id);
});

test('adding exercises creates one empty starting set', () => {
  const workout = sample();
  assert.equal(workout.exercises.length, 2);
  assert.equal(workout.exercises[0].sets.length, 1);
  assert.equal(workout.exercises[0].sets[0].done, false);
  assert.equal(workout.exercises[0].restSeconds, 150);
});

test('mutations never touch the original object', () => {
  const workout = sample();
  const blockId = workout.exercises[0].id;
  const next = addSet(workout, blockId);

  assert.equal(workout.exercises[0].sets.length, 1);
  assert.equal(next.exercises[0].sets.length, 2);
  assert.notEqual(workout, next);
});

test('a new set inherits the previous one values', () => {
  let workout = sample();
  const blockId = workout.exercises[0].id;
  const setId = workout.exercises[0].sets[0].id;

  workout = updateSet(workout, blockId, setId, { weight: 80, reps: 8 });
  workout = addSet(workout, blockId);

  assert.equal(workout.exercises[0].sets[1].weight, 80);
  assert.equal(workout.exercises[0].sets[1].reps, 8);
  assert.equal(workout.exercises[0].sets[1].done, false);
});

test('a warmup set is never used as the template', () => {
  let workout = sample();
  const blockId = workout.exercises[0].id;
  const setId = workout.exercises[0].sets[0].id;

  workout = updateSet(workout, blockId, setId, { weight: 100, reps: 5, type: 'normal' });
  workout = addSet(workout, blockId);
  const warmupId = workout.exercises[0].sets[1].id;
  workout = updateSet(workout, blockId, warmupId, { weight: 40, reps: 12, type: 'warmup' });
  workout = addSet(workout, blockId);

  assert.equal(workout.exercises[0].sets[2].weight, 100);
});

test('removing sets and exercises', () => {
  let workout = sample();
  const blockId = workout.exercises[0].id;

  workout = addSet(workout, blockId);
  const setId = workout.exercises[0].sets[1].id;
  workout = removeSet(workout, blockId, setId);
  assert.equal(workout.exercises[0].sets.length, 1);

  workout = removeExercise(workout, blockId);
  assert.equal(workout.exercises.length, 1);
  assert.equal(workout.exercises[0].name, 'Squat');
});

test('reordering exercises respects the bounds', () => {
  const workout = sample();
  const firstId = workout.exercises[0].id;

  const moved = moveExercise(workout, firstId, 1);
  assert.equal(moved.exercises[0].name, 'Squat');
  assert.equal(moved.exercises[1].name, 'Panca piana');

  // Past the edge, nothing happens.
  assert.equal(moveExercise(workout, firstId, -1), workout);
});

test('closing the session discards incomplete sets', () => {
  let workout = sample();
  const blockId = workout.exercises[0].id;
  const setId = workout.exercises[0].sets[0].id;

  workout = updateSet(workout, blockId, setId, { weight: 80, reps: 8, done: true });
  workout = addSet(workout, blockId);

  const finished = finishWorkout(workout, '2026-08-01T11:00:00.000Z');

  assert.equal(finished.status, 'completed');
  assert.equal(finished.finishedAt, '2026-08-01T11:00:00.000Z');
  assert.equal(finished.exercises.length, 1, 'lo squat, senza serie fatte, sparisce');
  assert.equal(finished.exercises[0].sets.length, 1);
});

test('hasLoggedSets tells an empty session from a real one', () => {
  const workout = sample();
  assert.equal(hasLoggedSets(workout), false);

  const blockId = workout.exercises[0].id;
  const setId = workout.exercises[0].sets[0].id;
  const withSet = updateSet(workout, blockId, setId, { done: true, weight: 60, reps: 10 });

  assert.equal(hasLoggedSets(withSet), true);
});

test('routine -> session: creates the expected number of sets', () => {
  const routine = {
    id: 'r1',
    name: 'Push',
    exercises: [
      { exerciseId: 'panca-piana', name: 'Panca piana', sets: 4, reps: 8, restSeconds: 150 },
    ],
  };

  const workout = workoutFromRoutine(routine, '2026-08-01T10:00:00.000Z');
  assert.equal(workout.name, 'Push');
  assert.equal(workout.routineId, 'r1');
  assert.equal(workout.exercises[0].sets.length, 4);
  assert.equal(workout.exercises[0].sets[0].reps, 8);
  assert.equal(workout.exercises[0].sets[0].done, false);
});

test('session -> routine: averages the reps of completed sets', () => {
  let workout = sample();
  workout = removeExercise(workout, workout.exercises[1].id);

  const blockId = workout.exercises[0].id;
  workout = updateSet(workout, blockId, workout.exercises[0].sets[0].id, {
    weight: 80,
    reps: 8,
    done: true,
  });
  workout = addSet(workout, blockId);
  workout = updateSet(workout, blockId, workout.exercises[0].sets[1].id, {
    weight: 80,
    reps: 6,
    done: true,
  });

  const routine = routineFromWorkout(workout, 'Nuova routine');
  assert.equal(routine.name, 'Nuova routine');
  assert.equal(routine.exercises[0].sets, 2);
  assert.equal(routine.exercises[0].reps, 7);
  assert.equal(routine.exercises[0].restSeconds, 150);
});

test('createSet: coherent defaults', () => {
  const set = createSet();
  assert.equal(set.type, 'normal');
  assert.equal(set.done, false);
  assert.equal(set.weight, '');
  assert.equal(set.reps, '');
  assert.ok(set.id);
});
