/**
 * Store applicativo: unica fonte di verità + persistenza.
 *
 * La sessione in corso viene salvata a ogni modifica (con debounce), così
 * chiudere l'app, ricevere una chiamata o restare senza batteria non fa
 * perdere l'allenamento — il difetto che manda in bestia chi usa un diario
 * di palestra sul telefono.
 */

import * as db from './db.js';
import { STORES } from './db.js';
import { EXERCISES } from '../data/exercises.js';
import { PRESET_ROUTINES } from '../data/routines.js';
import {
  buildLastPerformance,
  evaluatePersonalRecord,
  rebuildRecords,
} from './metrics.js';
import { finishWorkout, hasLoggedSets } from './workout.js';

const ACTIVE_KEY = 'activeWorkout';
const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS = {
  theme: 'system',
  sound: true,
  vibration: true,
  keepAwake: true,
  autoRest: true,
  defaultRest: 90,
  barWeight: 20,
  availablePlates: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5],
};

const listeners = new Set();

export const state = {
  ready: false,
  workouts: [],
  routines: [],
  records: new Map(),
  customExercises: [],
  lastPerformance: new Map(),
  active: null,
  settings: { ...DEFAULT_SETTINGS },
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(reason = 'change') {
  listeners.forEach((fn) => fn(reason));
}

/* -------------------------------------------------------------------------
   Avvio
   ------------------------------------------------------------------------- */
export async function init() {
  const [workouts, routines, records, customExercises, active, settings] =
    await Promise.all([
      db.getAll(STORES.workouts),
      db.getAll(STORES.routines),
      db.getAll(STORES.records),
      db.getAll(STORES.exercises),
      db.getMeta(ACTIVE_KEY, null),
      db.getMeta(SETTINGS_KEY, null),
    ]);

  state.workouts = workouts.sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
  );
  state.records = new Map(records.map((r) => [r.exerciseId, r]));
  state.customExercises = customExercises;
  state.active = active;
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  // Le routine di esempio vengono seminate una sola volta: se l'utente le
  // cancella non devono ricomparire al riavvio.
  const seeded = await db.getMeta('routinesSeeded', false);
  if (!routines.length && !seeded) {
    await db.putMany(STORES.routines, PRESET_ROUTINES);
    await db.setMeta('routinesSeeded', true);
    state.routines = [...PRESET_ROUTINES];
  } else {
    state.routines = routines;
  }

  reindex();
  state.ready = true;
  db.requestPersistentStorage();
  emit('ready');
}

function reindex() {
  state.lastPerformance = buildLastPerformance(
    state.workouts.filter((w) => w.status === 'completed'),
  );
}

/* -------------------------------------------------------------------------
   Esercizi
   ------------------------------------------------------------------------- */
export function allExercises() {
  return [...EXERCISES, ...state.customExercises];
}

export function findExercise(id) {
  return allExercises().find((e) => e.id === id) || null;
}

export async function addCustomExercise(exercise) {
  const record = { ...exercise, custom: true };
  await db.put(STORES.exercises, record);
  state.customExercises = [...state.customExercises, record];
  emit('exercises');
  return record;
}

/* -------------------------------------------------------------------------
   Sessione attiva
   ------------------------------------------------------------------------- */
let saveTimer = null;

export function setActive(workout, { immediate = false } = {}) {
  state.active = workout;
  emit('active');
  if (immediate) return persistActive();

  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistActive, 400);
  return Promise.resolve();
}

export function persistActive() {
  clearTimeout(saveTimer);
  return db.setMeta(ACTIVE_KEY, state.active);
}

export async function discardActive() {
  state.active = null;
  await db.setMeta(ACTIVE_KEY, null);
  emit('active');
}

/**
 * Conclude la sessione: salva l'allenamento, aggiorna i record e reindicizza
 * le prestazioni precedenti.
 * @returns {{saved: boolean, workout: object|null, newRecords: object[]}}
 */
export async function completeActive() {
  const active = state.active;
  if (!active) return { saved: false, workout: null, newRecords: [] };

  if (!hasLoggedSets(active)) {
    await discardActive();
    return { saved: false, workout: null, newRecords: [] };
  }

  const workout = finishWorkout(active);
  await db.put(STORES.workouts, workout);

  state.workouts = [workout, ...state.workouts].sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
  );

  state.active = null;
  await db.setMeta(ACTIVE_KEY, null);
  reindex();
  emit('workouts');

  return { saved: true, workout, newRecords: [] };
}

/* -------------------------------------------------------------------------
   Record personali
   ------------------------------------------------------------------------- */

/** Valuta una serie appena completata e persiste l'eventuale nuovo record. */
export async function registerSetForRecords({ exerciseId, name, weight, reps, type, at }) {
  const current = state.records.get(exerciseId) || null;
  const { record, broken } = evaluatePersonalRecord(current, {
    exerciseId,
    name,
    weight,
    reps,
    type,
    at,
  });

  if (!broken.length) return [];

  state.records.set(exerciseId, record);
  await db.put(STORES.records, record);
  emit('records');
  return broken;
}

export function recordFor(exerciseId) {
  return state.records.get(exerciseId) || null;
}

async function resyncRecords() {
  const rebuilt = rebuildRecords(state.workouts.filter((w) => w.status === 'completed'));
  await db.clear(STORES.records);
  await db.putMany(STORES.records, rebuilt);
  state.records = new Map(rebuilt.map((r) => [r.exerciseId, r]));
}

/* -------------------------------------------------------------------------
   Storico
   ------------------------------------------------------------------------- */
export async function deleteWorkout(id) {
  await db.remove(STORES.workouts, id);
  state.workouts = state.workouts.filter((w) => w.id !== id);
  await resyncRecords();
  reindex();
  emit('workouts');
}

export async function clearAllWorkouts() {
  await db.clear(STORES.workouts);
  await db.clear(STORES.records);
  state.workouts = [];
  state.records = new Map();
  reindex();
  emit('workouts');
}

/* -------------------------------------------------------------------------
   Routine
   ------------------------------------------------------------------------- */
export async function saveRoutine(routine) {
  await db.put(STORES.routines, routine);
  const index = state.routines.findIndex((r) => r.id === routine.id);
  if (index >= 0) state.routines[index] = routine;
  else state.routines = [...state.routines, routine];
  emit('routines');
  return routine;
}

export async function deleteRoutine(id) {
  await db.remove(STORES.routines, id);
  state.routines = state.routines.filter((r) => r.id !== id);
  emit('routines');
}

export function findRoutine(id) {
  return state.routines.find((r) => r.id === id) || null;
}

/* -------------------------------------------------------------------------
   Impostazioni
   ------------------------------------------------------------------------- */
export async function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await db.setMeta(SETTINGS_KEY, state.settings);
  emit('settings');
  return state.settings;
}

/* -------------------------------------------------------------------------
   Import / export
   ------------------------------------------------------------------------- */
export function exportData() {
  return {
    app: 'forgia',
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts: state.workouts,
    routines: state.routines,
    customExercises: state.customExercises,
    settings: state.settings,
  };
}

export async function importData(payload, { merge = true } = {}) {
  if (!payload || !Array.isArray(payload.workouts)) {
    throw new Error('File non riconosciuto: manca l’elenco degli allenamenti.');
  }

  if (!merge) {
    await db.clear(STORES.workouts);
    await db.clear(STORES.routines);
    state.workouts = [];
    state.routines = [];
  }

  const known = new Set(state.workouts.map((w) => w.id));
  const incoming = payload.workouts.filter((w) => w?.id && !known.has(w.id));
  await db.putMany(STORES.workouts, incoming);
  state.workouts = [...state.workouts, ...incoming].sort(
    (a, b) => new Date(b.startedAt) - new Date(a.startedAt),
  );

  if (Array.isArray(payload.routines) && payload.routines.length) {
    const knownRoutines = new Set(state.routines.map((r) => r.id));
    const newRoutines = payload.routines.filter((r) => r?.id && !knownRoutines.has(r.id));
    await db.putMany(STORES.routines, newRoutines);
    state.routines = [...state.routines, ...newRoutines];
  }

  if (Array.isArray(payload.customExercises) && payload.customExercises.length) {
    const knownEx = new Set(state.customExercises.map((e) => e.id));
    const newEx = payload.customExercises.filter((e) => e?.id && !knownEx.has(e.id));
    await db.putMany(STORES.exercises, newEx);
    state.customExercises = [...state.customExercises, ...newEx];
  }

  await resyncRecords();
  reindex();
  emit('workouts');
  return incoming.length;
}
