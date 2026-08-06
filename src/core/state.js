/**
 * Application state: the in-memory mirror of storage, plus the writes.
 *
 * Features read `state` and call these functions; nothing else touches a
 * repository. That keeps the storage swap in services/ invisible upstream.
 */
import { repo, persist } from '../services/db.js';
import { queue } from '../services/sync.js';
import { emit } from './bus.js';
import * as prefs from '../services/prefs.js';
import { TEMPLATES, templateById, nextSession } from '../data/programs.js';

const sets = repo('sets');
const body = repo('body');
const favourites = repo('favourites');
const goals = repo('goals');

export const state = {
  sets: [],
  body: [],
  favourites: [],
  goals: [],
  ready: false,
};

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export async function init() {
  const [s, b, f, g] = await Promise.all([sets.all(), body.all(), favourites.all(), goals.all()]);
  state.sets = s.sort((a, b2) => new Date(b2.at) - new Date(a.at));
  state.body = b.sort((a, b2) => new Date(b2.at) - new Date(a.at));
  state.favourites = f;
  state.goals = g;
  state.ready = true;
  persist();
  emit('state');
}

/* ------------------------------------------------------------------ sets */

export async function logSet({ exerciseId, name, weight, reps, rpe = null, note = '', sessionId = null }) {
  const entry = {
    id: uid(),
    at: new Date().toISOString(),
    exerciseId,
    name,
    weight: Number(weight) || 0,
    reps: Number(reps) || 0,
    rpe,
    note,
    sessionId,
  };
  state.sets = [entry, ...state.sets];
  await sets.put(entry);
  await queue('set:add', entry);
  emit('state');
  emit('set:logged', entry);
  return entry;
}

export async function removeSet(id) {
  state.sets = state.sets.filter((s) => s.id !== id);
  await sets.remove(id);
  await queue('set:remove', { id });
  emit('state');
}

/* ------------------------------------------------------------ body & co. */

export async function logBody({ weight, note = '' }) {
  const entry = { id: uid(), at: new Date().toISOString(), weight: Number(weight) || 0, note };
  state.body = [entry, ...state.body];
  await body.put(entry);
  await queue('body:add', entry);
  emit('state');
  return entry;
}

export async function toggleFavourite(exerciseId, name) {
  const existing = state.favourites.find((f) => f.id === exerciseId);
  if (existing) {
    state.favourites = state.favourites.filter((f) => f.id !== exerciseId);
    await favourites.remove(exerciseId);
  } else {
    const entry = { id: exerciseId, name, at: Date.now() };
    state.favourites = [...state.favourites, entry];
    await favourites.put(entry);
  }
  emit('state');
}

export const isFavourite = (id) => state.favourites.some((f) => f.id === id);

export async function saveGoal(goal) {
  const entry = { id: goal.id || uid(), ...goal };
  state.goals = [...state.goals.filter((g) => g.id !== entry.id), entry];
  await goals.put(entry);
  emit('state');
  return entry;
}

export async function removeGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  await goals.remove(id);
  emit('state');
}

/* -------------------------------------------------------------- planning */

/** The template the user is following, defaulted from their stated level. */
export function activeTemplate() {
  const chosen = prefs.get('template');
  if (chosen) return templateById(chosen);
  const level = prefs.get('level');
  return TEMPLATES.find((t) => t.level === level) || TEMPLATES[0];
}

export function setTemplate(id) {
  prefs.set({ template: id });
  emit('state');
}

/** Today's session: whatever is in progress, else the next in rotation. */
export function plannedSession(now = new Date()) {
  const template = activeTemplate();
  const todayId = state.sets.find(
    (s) => new Date(s.at).toDateString() === now.toDateString() && s.sessionId,
  )?.sessionId;

  if (todayId) {
    const found = template.sessions.find((s) => s.id === todayId);
    if (found) return { template, session: found };
  }

  const lastId = state.sets.find((s) => s.sessionId)?.sessionId || null;
  return { template, session: nextSession(template, lastId) };
}

export { prefs };
