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
const goals = repo('goals');

export const state = {
  sets: [],
  body: [],
  goals: [],
  ready: false,
};

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

async function durable(work) {
  try {
    return await work();
  } catch (error) {
    emit('storage:error', error);
    throw error;
  }
}

export async function init() {
  await reload();
  persist();
}

export async function reload() {
  const [s, b, g] = await Promise.all([sets.all(), body.all(), goals.all()]);
  state.sets = s.sort((a, b2) => new Date(b2.at) - new Date(a.at));
  state.body = b.sort((a, b2) => new Date(b2.at) - new Date(a.at));
  state.goals = g;
  state.ready = true;
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
  await durable(() => sets.put(entry));
  state.sets = [entry, ...state.sets];
  try {
    await queue('set:add', entry);
  } catch (error) {
    console.warn('[sync] set saved locally but could not be queued:', error);
  }
  emit('state');
  emit('set:logged', entry);
  return entry;
}

export async function removeSet(id) {
  await durable(() => sets.remove(id));
  state.sets = state.sets.filter((s) => s.id !== id);
  try {
    await queue('set:remove', { id });
  } catch (error) {
    console.warn('[sync] deletion saved locally but could not be queued:', error);
  }
  emit('state');
}

/* ------------------------------------------------------------ body & co. */

export async function logBody({ weight, note = '' }) {
  const entry = { id: uid(), at: new Date().toISOString(), weight: Number(weight) || 0, note };
  await durable(() => body.put(entry));
  state.body = [entry, ...state.body];
  try {
    await queue('body:add', entry);
  } catch (error) {
    console.warn('[sync] measurement saved locally but could not be queued:', error);
  }
  emit('state');
  return entry;
}

/* -------------------------------------------------------------- planning */

/** The template the user is following, defaulted from their stated level. */
export function activeTemplate() {
  const chosen = prefs.get('template');
  const custom = prefs.get('customTemplate');
  if (chosen === 'custom' && custom?.sessions?.length) return custom;
  if (chosen) return templateById(chosen);
  const level = prefs.get('level');
  return TEMPLATES.find((t) => t.level === level) || TEMPLATES[0];
}

export function setTemplate(id, options = {}) {
  prefs.set({ template: id, onboarded: true, ...options });
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
