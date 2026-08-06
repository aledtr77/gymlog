/**
 * State and persistence. Small on purpose: one array of entries, one list of
 * pinned exercises, and a change callback.
 */

import * as db from './db.js';
import { createEntry, sortNewestFirst } from './log.js';

const PINNED_KEY = 'pinned';

export const state = {
  entries: [],
  /** Exercises added but not yet logged, so they show up before first use. */
  pinned: [],
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

export async function init() {
  const [entries, pinned] = await Promise.all([db.all(), db.getMeta(PINNED_KEY, [])]);
  state.entries = sortNewestFirst(entries);
  state.pinned = Array.isArray(pinned) ? pinned : [];
  db.persist();
}

export async function addSet({ exerciseId, name, weight, reps }) {
  const entry = createEntry({ exerciseId, name, weight, reps });
  state.entries = [entry, ...state.entries];
  await db.put(entry);
  emit();
  return entry;
}

export async function removeSet(id) {
  state.entries = state.entries.filter((e) => e.id !== id);
  await db.remove(id);
  emit();
}

/** Adding an exercise just pins it: nothing is logged until you do a set. */
export async function pinExercise({ id, name }) {
  if (state.pinned.some((e) => e.id === id)) return;
  state.pinned = [{ id, name }, ...state.pinned];
  await db.setMeta(PINNED_KEY, state.pinned);
  emit();
}

export async function unpinExercise(id) {
  state.pinned = state.pinned.filter((e) => e.id !== id);
  await db.setMeta(PINNED_KEY, state.pinned);
  emit();
}

export async function clearAll() {
  state.entries = [];
  await db.clear();
  emit();
}
