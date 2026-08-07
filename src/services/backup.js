/** Portable, validated backups. Format version is independent from the database. */
import { DB_VERSION, DATA_STORES, readStores, restoreStores } from './db.js';
import * as prefs from './prefs.js';

export const BACKUP_VERSION = 1;
export const APP_VERSION = '1.0.0';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

async function toPortable(value) {
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    const bytes = new Uint8Array(await value.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return { $gymlogType: 'blob', type: value.type, data: btoa(binary) };
  }
  if (Array.isArray(value)) return Promise.all(value.map(toPortable));
  if (isObject(value)) {
    const pairs = await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await toPortable(child)]));
    return Object.fromEntries(pairs);
  }
  return value;
}

function fromPortable(value) {
  if (Array.isArray(value)) return value.map(fromPortable);
  if (isObject(value) && value.$gymlogType === 'blob') {
    if (typeof value.data !== 'string' || typeof value.type !== 'string') throw new Error('Invalid binary backup entry');
    const binary = atob(value.data);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: value.type });
  }
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, fromPortable(child)]));
  return value;
}

function validateRecord(name, value, ids) {
  if (!isObject(value) || typeof value.id !== 'string' || !value.id.trim()) {
    throw new Error(`${name}: every record needs a non-empty id`);
  }
  if (ids.has(value.id)) throw new Error(`${name}: duplicate id ${value.id}`);
  ids.add(value.id);

  if (name === 'sets') {
    if (typeof value.at !== 'string' || Number.isNaN(Date.parse(value.at))) throw new Error('sets: invalid date');
    if (typeof value.exerciseId !== 'string' || !value.exerciseId) throw new Error('sets: invalid exercise');
    if (!Number.isFinite(Number(value.weight)) || !Number.isFinite(Number(value.reps))) throw new Error('sets: invalid weight or reps');
  }
  if (name === 'body') {
    if (typeof value.at !== 'string' || Number.isNaN(Date.parse(value.at))) throw new Error('body: invalid date');
    if (!Number.isFinite(Number(value.weight))) throw new Error('body: invalid weight');
  }
}

function normalizeStores(value = {}) {
  if (!isObject(value)) throw new Error('Backup stores are missing');
  const stores = {};
  for (const name of DATA_STORES) {
    const rows = value[name] ?? [];
    if (!Array.isArray(rows)) throw new Error(`${name}: expected a list`);
    const ids = new Set();
    rows.forEach((row) => validateRecord(name, row, ids));
    stores[name] = rows.map((row) => structuredClone(row));
  }
  return stores;
}

function migrateLegacyBackup(value) {
  if (value?.app !== 'gymlog') throw new Error('This is not a GymLog backup');
  return {
    app: 'gymlog',
    formatVersion: BACKUP_VERSION,
    appVersion: 'legacy',
    databaseVersion: Number(value.version) || 0,
    preferencesVersion: 0,
    createdAt: value.at || new Date(0).toISOString(),
    preferences: prefs.normalizePreferences({ profile: value.profile }),
    stores: {
      sets: value.sets || [],
      body: value.body || [],
      goals: value.goals || [],
    },
  };
}

export function validateBackup(input) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : structuredClone(input);
  const value = parsed?.formatVersion === undefined ? migrateLegacyBackup(parsed) : parsed;

  if (!isObject(value) || value.app !== 'gymlog') throw new Error('This is not a GymLog backup');
  if (!Number.isInteger(Number(value.formatVersion)) || Number(value.formatVersion) < 1) throw new Error('Invalid backup version');
  if (Number(value.formatVersion) > BACKUP_VERSION) throw new Error('Backup created by a newer GymLog version');
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) throw new Error('Backup creation date is invalid');

  return {
    ...value,
    formatVersion: Number(value.formatVersion),
    preferences: prefs.normalizePreferences(value.preferences),
    stores: normalizeStores(value.stores),
  };
}

export async function createBackup() {
  return toPortable({
    app: 'gymlog',
    formatVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    databaseVersion: DB_VERSION,
    preferencesVersion: prefs.PREFS_VERSION,
    createdAt: new Date().toISOString(),
    preferences: prefs.get(),
    stores: await readStores(),
  });
}

export async function backupText() {
  return JSON.stringify(await createBackup(), null, 2);
}

export async function restoreBackup(input, { mode = 'merge' } = {}) {
  const portable = validateBackup(typeof input === 'string' ? input : input);
  const backup = fromPortable(portable);
  const before = { stores: await readStores(), preferences: prefs.get() };

  await restoreStores(backup.stores, { mode });
  try {
    prefs.replace(mode === 'merge' ? { ...before.preferences, ...backup.preferences } : backup.preferences);
  } catch (error) {
    await restoreStores(before.stores, { mode: 'replace' });
    try {
      prefs.replace(before.preferences);
    } catch {
      // The original IndexedDB data has still been restored; preference storage is unavailable.
    }
    throw error;
  }

  return {
    mode,
    counts: Object.fromEntries(DATA_STORES.map((name) => [name, backup.stores[name].length])),
  };
}
