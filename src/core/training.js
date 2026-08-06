/**
 * Training logic. Pure functions — no DOM, no storage, no clock except one
 * passed in — which is why this is the part the tests can pin down.
 *
 * The progression rule is deliberately the simplest one that works: clear
 * every set at the target reps and the load goes up next time; fall short
 * and it holds. Two sessions stuck at the same load triggers a small
 * deload. Anything cleverer on a non-competitive lifter is noise they will
 * stop trusting.
 */

import { round, loadable } from '../utils/num.js';
import { sameDay, startOfDay, startOfWeek } from '../utils/date.js';

export const BODYWEIGHT = new Set(['trazioni', 'trazioni-presa-inversa', 'piegamenti', 'dip-petto', 'dip-tricipiti']);
export const TIMED = new Set(['plank', 'plank-laterale', 'hollow-hold']);

export const isTimed = (id) => TIMED.has(id);
export const isBodyweight = (id) => BODYWEIGHT.has(id);

/** Smallest increment you can actually load for a given lift. */
export function stepFor(lift) {
  if (isTimed(lift.exerciseId)) return 5; // seconds
  if (isBodyweight(lift.exerciseId)) return 1; // reps, or a weight belt
  return lift.start >= 40 ? 5 : 2.5;
}

const setsOf = (sets, exerciseId) => sets.filter((s) => s.exerciseId === exerciseId);

/** All sets from the most recent day this lift was trained, before today. */
export function lastBout(sets, exerciseId, now = new Date()) {
  const past = setsOf(sets, exerciseId)
    .filter((s) => !sameDay(s.at, now))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  if (!past.length) return null;
  return past.filter((s) => sameDay(s.at, past[0].at));
}

/**
 * What to lift today, and why. The reason travels with the number because a
 * target you cannot explain is a target you will override at random.
 */
export function targetFor(sets, lift, now = new Date()) {
  const bout = lastBout(sets, lift.exerciseId, now);
  const step = stepFor(lift);

  if (!bout) {
    return {
      weight: lift.start,
      reps: lift.reps,
      status: 'start',
      why: 'Prima volta: parti leggero, impara il movimento.',
    };
  }

  const load = Math.max(...bout.map((s) => s.weight));
  const working = bout.filter((s) => s.weight >= load - 1e-6);
  const cleared = working.length >= lift.sets && working.every((s) => s.reps >= lift.reps);

  if (cleared) {
    return {
      weight: loadable(load + step, isTimed(lift.exerciseId) ? 1 : 1.25),
      reps: lift.reps,
      status: 'up',
      why: `Chiuse tutte le serie: +${round(step, 2)}.`,
    };
  }

  if (stallCount(sets, lift, now) >= 2) {
    return {
      weight: loadable(load * 0.9, 1.25),
      reps: lift.reps,
      status: 'deload',
      why: 'Fermo da due sedute: scarica del 10% e risali.',
    };
  }

  return {
    weight: load,
    reps: lift.reps,
    status: 'hold',
    why: `Stesso carico: chiudi ${lift.sets}×${lift.reps} e sali.`,
  };
}

/** Consecutive past bouts that failed to beat the current load. */
export function stallCount(sets, lift, now = new Date()) {
  const days = [
    ...new Set(
      setsOf(sets, lift.exerciseId)
        .filter((s) => !sameDay(s.at, now))
        .map((s) => startOfDay(s.at).getTime()),
    ),
  ].sort((a, b) => b - a);

  if (days.length < 2) return 0;

  const loadOn = (day) =>
    Math.max(...setsOf(sets, lift.exerciseId).filter((s) => sameDay(s.at, day)).map((s) => s.weight));

  const top = loadOn(days[0]);
  let stalls = 0;
  for (let i = 1; i < days.length; i += 1) {
    if (loadOn(days[i]) >= top - 1e-6) stalls += 1;
    else break;
  }
  return stalls;
}

/** Builds today's session from a template session plus history. */
export function buildSession(templateSession, sets, now = new Date()) {
  const today = sets.filter((s) => sameDay(s.at, now));

  const lifts = templateSession.lifts.map((lift) => {
    const logged = today
      .filter((s) => s.exerciseId === lift.exerciseId)
      .sort((a, b) => new Date(a.at) - new Date(b.at));
    return {
      ...lift,
      target: targetFor(sets, lift, now),
      logged,
      done: logged.length >= lift.sets,
    };
  });

  const setsDone = lifts.reduce((n, l) => n + l.logged.length, 0);
  const setsTotal = lifts.reduce((n, l) => n + l.sets, 0);

  return {
    ...templateSession,
    lifts,
    setsDone,
    setsTotal,
    started: setsDone > 0,
    complete: lifts.every((l) => l.done),
    nextIndex: Math.max(0, lifts.findIndex((l) => !l.done)),
  };
}

/* -------------------------------------------------------------- analytics */

export const volume = (sets) =>
  Math.round(sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0));

/** Epley. At one rep it is the load itself. */
export function oneRepMax(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return round(r === 1 ? w : w * (1 + r / 30), 1);
}

export function personalBests(sets) {
  const best = new Map();
  for (const s of sets) {
    const current = best.get(s.exerciseId);
    const orm = oneRepMax(s.weight, s.reps);
    if (!current || orm > current.oneRm) {
      best.set(s.exerciseId, { exerciseId: s.exerciseId, name: s.name, oneRm: orm, weight: s.weight, reps: s.reps, at: s.at });
    }
  }
  return [...best.values()].sort((a, b) => b.oneRm - a.oneRm);
}

/** Volume per week for the last `weeks` weeks, oldest first. */
export function weeklyVolume(sets, weeks = 8, now = new Date()) {
  const out = [];
  const cursor = startOfWeek(now);

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const from = new Date(cursor);
    from.setDate(from.getDate() - i * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    const inWeek = sets.filter((s) => {
      const at = new Date(s.at);
      return at >= from && at < to;
    });
    out.push({ from, volume: volume(inWeek), sets: inWeek.length });
  }
  return out;
}

/** Consecutive days ending today (or yesterday) with at least one set. */
export function streak(sets, now = new Date()) {
  const days = new Set(sets.map((s) => startOfDay(s.at).getTime()));
  let count = 0;
  const cursor = startOfDay(now);

  if (!days.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.getTime())) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function muscleSplit(sets, resolve) {
  const totals = new Map();
  for (const s of sets) {
    const muscle = resolve(s.exerciseId) || 'Altro';
    totals.set(muscle, (totals.get(muscle) || 0) + (s.weight || 0) * (s.reps || 0));
  }
  return [...totals.entries()]
    .map(([muscle, v]) => ({ muscle, volume: Math.round(v) }))
    .sort((a, b) => b.volume - a.volume);
}
