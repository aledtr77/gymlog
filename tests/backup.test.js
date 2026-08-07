import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';

globalThis.indexedDB = indexedDB;
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

const { BACKUP_VERSION, backupText, deleteAllData, restoreBackup, validateBackup } = await import('../src/services/backup.js');
const { readStores, restoreStores } = await import('../src/services/db.js');
const prefs = await import('../src/services/prefs.js');

const base = () => ({
  app: 'gymlog',
  formatVersion: BACKUP_VERSION,
  appVersion: '1.0.0',
  databaseVersion: 4,
  preferencesVersion: 2,
  createdAt: '2026-08-07T10:00:00.000Z',
  preferences: { theme: 'dark', profile: { sex: 'f', age: 30, height: 165, weight: 60 } },
  stores: {
    sets: [{ id: 's1', at: '2026-08-01T10:00:00.000Z', exerciseId: 'squat', name: 'Squat', weight: 60, reps: 8 }],
    body: [{ id: 'b1', at: '2026-08-01T09:00:00.000Z', weight: 60 }],
    goals: [],
    sessions: [],
    workouts: [],
    favourites: [],
    photos: [],
  },
});

test('a complete backup round-trips through replace restore', async () => {
  const result = await restoreBackup(JSON.stringify(base()), { mode: 'replace' });
  assert.equal(result.counts.sets, 1);
  assert.equal((await readStores()).sets[0].id, 's1');
  assert.equal(prefs.get('theme'), 'dark');

  const exported = validateBackup(await backupText());
  assert.equal(exported.stores.sets.length, 1);
  assert.equal(exported.preferences.profile.sex, 'f');
});

test('merge keeps existing IDs not present in the incoming backup', async () => {
  const incoming = base();
  incoming.stores.sets = [{ id: 's2', at: '2026-08-02T10:00:00.000Z', exerciseId: 'bench', name: 'Bench', weight: 40, reps: 8 }];
  await restoreBackup(incoming, { mode: 'merge' });
  assert.deepEqual((await readStores()).sets.map((row) => row.id).sort(), ['s1', 's2']);
});

test('legacy exports remain importable', () => {
  const value = validateBackup({
    app: 'gymlog',
    version: 3,
    at: '2026-08-01T00:00:00.000Z',
    profile: { sex: 'm', weight: 80 },
    sets: [{ id: 'old', at: '2026-08-01T10:00:00.000Z', exerciseId: 'row', name: 'Row', weight: 50, reps: 10 }],
    body: [],
    goals: [],
  });
  assert.equal(value.stores.sets[0].id, 'old');
  assert.equal(value.preferences.profile.sex, 'm');
});

test('invalid or future backups are rejected before writing', () => {
  const duplicate = base();
  duplicate.stores.sets.push({ ...duplicate.stores.sets[0] });
  assert.throws(() => validateBackup(duplicate), /duplicate id/);
  assert.throws(() => validateBackup({ ...base(), formatVersion: BACKUP_VERSION + 1 }), /newer GymLog version/);
});

test('a failed multi-store restore rolls the IndexedDB transaction back', async () => {
  const before = (await readStores()).sets.map((row) => row.id).sort();
  await assert.rejects(
    restoreStores({
      sets: [
        { id: 'would-be-partial', at: '2026-08-03T10:00:00.000Z', exerciseId: 'row' },
        { at: '2026-08-03T11:00:00.000Z', exerciseId: 'invalid-without-id' },
      ],
    }, { mode: 'replace' }),
  );
  assert.deepEqual((await readStores()).sets.map((row) => row.id).sort(), before);
});

test('delete all data empties every store and restores default preferences', async () => {
  await restoreBackup(base(), { mode: 'replace' });
  await deleteAllData();

  const stores = await readStores();
  assert.ok(Object.values(stores).every((rows) => rows.length === 0));
  assert.equal(prefs.get('template'), null);
  assert.equal(prefs.get('onboarded'), false);
  assert.equal(prefs.get('theme'), 'system');
});
