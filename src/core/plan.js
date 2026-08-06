/**
 * Turns the plan plus your history into today's session.
 *
 * This is the "support" part: the app decides the load, so the only thing
 * left to do is lift. The rule is the one every beginner programme uses —
 * finish all your sets at the target reps and the weight goes up next time;
 * fall short and it stays. Nothing else, because anything cleverer than
 * that on a novice is noise.
 *
 * Pure functions: no DOM, no storage.
 */

import { PROGRAM, nextDay } from '../data/program.js';
import { sameDay, sortNewestFirst } from './log.js';

/** Smallest increase that is actually loadable, per lift. */
export function stepFor(lift) {
  if (lift.exerciseId === 'plank') return 5; // seconds, not kilos
  return lift.start >= 20 ? 2.5 : 1;
}

/**
 * What to lift today on one exercise.
 *
 * Returns the suggested load and why, so the number never looks arbitrary.
 */
export function targetFor(entries, lift, now = new Date()) {
  const past = sortNewestFirst(entries).filter(
    (e) => e.exerciseId === lift.exerciseId && !sameDay(e.at, now),
  );

  if (!past.length) {
    return {
      weight: lift.start,
      reps: lift.reps,
      status: 'start',
      why: 'Prima volta: parti leggero e impara il movimento.',
    };
  }

  // All sets from the most recent session on this lift.
  const lastAt = past[0].at;
  const lastSets = past.filter((e) => sameDay(e.at, lastAt));
  const load = Math.max(...lastSets.map((e) => e.weight));
  const atLoad = lastSets.filter((e) => e.weight >= load - 1e-6);
  const cleared = atLoad.length >= lift.sets && atLoad.every((e) => e.reps >= lift.reps);
  const step = stepFor(lift);

  if (cleared) {
    return {
      weight: Math.round((load + step) * 100) / 100,
      reps: lift.reps,
      status: 'up',
      why: `L'ultima volta hai chiuso tutte le serie: si sale di ${step}.`,
    };
  }

  return {
    weight: load,
    reps: lift.reps,
    status: 'same',
    why: `Stesso carico dell'ultima volta: chiudi ${lift.sets}×${lift.reps} e sali.`,
  };
}

/** The id of the plan day you trained most recently. */
export function lastDayId(entries) {
  for (const entry of sortNewestFirst(entries)) {
    if (entry.dayId) return entry.dayId;
  }
  return null;
}

/**
 * Builds today's session: which day it is, and for each lift the target and
 * how many sets are already logged today.
 */
export function todaySession(entries, now = new Date()) {
  const doneToday = entries.filter((e) => sameDay(e.at, now));

  // If you already started a session today, stay on it rather than flipping
  // to the other day halfway through.
  const startedId = doneToday.length ? doneToday[doneToday.length - 1].dayId : null;
  const day = startedId
    ? PROGRAM.find((d) => d.id === startedId) || nextDay(lastDayId(entries))
    : nextDay(lastDayId(entries));

  const exercises = day.exercises.map((lift) => {
    const logged = doneToday.filter((e) => e.exerciseId === lift.exerciseId);
    return {
      ...lift,
      target: targetFor(entries, lift, now),
      logged,
      done: logged.length >= lift.sets,
    };
  });

  return {
    day,
    exercises,
    setsDone: exercises.reduce((n, e) => n + e.logged.length, 0),
    setsTotal: exercises.reduce((n, e) => n + e.sets, 0),
    complete: exercises.every((e) => e.done),
    started: doneToday.length > 0,
  };
}

/** Index of the first exercise that still has sets left. */
export function firstUnfinished(session) {
  const index = session.exercises.findIndex((e) => !e.done);
  return index === -1 ? 0 : index;
}
