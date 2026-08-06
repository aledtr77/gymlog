/**
 * The whole data model.
 *
 * One entry = one set you actually did:
 *
 *     { id, at, exerciseId, name, weight, reps }
 *
 * That is the entire schema. There are no sessions, no routines, no set
 * types, no statuses. Everything the app shows is derived from this flat
 * list, which is why there is nothing to learn: you did a set, it is a row.
 *
 * Pure functions only — no DOM, no storage, no Date.now() except where a
 * clock is passed in.
 */

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEntry({ exerciseId, name, weight, reps, at, dayId = null }) {
  return {
    id: uid(),
    at: at || new Date().toISOString(),
    exerciseId,
    name,
    weight: Number(weight) || 0,
    reps: Number(reps) || 0,
    // Which day of the plan this set belonged to, so the app can alternate
    // A and B without asking.
    dayId,
  };
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Newest first — the order every screen wants. */
export function sortNewestFirst(entries) {
  return [...entries].sort((a, b) => new Date(b.at) - new Date(a.at));
}

/**
 * The last set recorded for an exercise, ignoring anything logged today.
 *
 * "Today" is excluded on purpose: what you want prefilled is what you did
 * *last session*, not the set you finished ninety seconds ago. Without this,
 * the numbers drift down as soon as you have one bad set.
 */
export function lastSession(entries, exerciseId, now = new Date()) {
  const previous = sortNewestFirst(entries).filter(
    (e) => e.exerciseId === exerciseId && !sameDay(e.at, now),
  );
  return previous[0] || null;
}

/** Every set done today for one exercise, oldest first: it reads as a list. */
export function todayFor(entries, exerciseId, now = new Date()) {
  return sortNewestFirst(entries)
    .filter((e) => e.exerciseId === exerciseId && sameDay(e.at, now))
    .reverse();
}

/** Everything done today, oldest first. */
export function today(entries, now = new Date()) {
  return sortNewestFirst(entries)
    .filter((e) => sameDay(e.at, now))
    .reverse();
}

/** Groups the log into days, newest day first, for the history screen. */
export function byDay(entries) {
  const days = new Map();

  for (const entry of sortNewestFirst(entries)) {
    const key = startOfDay(entry.at).toISOString();
    if (!days.has(key)) days.set(key, { date: entry.at, entries: [] });
    days.get(key).entries.push(entry);
  }

  return [...days.values()].map((day) => ({
    ...day,
    entries: [...day.entries].reverse(),
  }));
}

/** Total kilos moved, the one number worth showing. */
export function volume(entries) {
  const total = entries.reduce((sum, e) => sum + e.weight * e.reps, 0);
  return Math.round(total);
}
