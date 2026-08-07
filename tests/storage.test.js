import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { DB_NAME, DB_VERSION, STORES, upgradeDatabase } from '../src/services/migrations.js';

const request = (value) => new Promise((resolve, reject) => {
  value.onsuccess = () => resolve(value.result);
  value.onerror = () => reject(value.error);
});

function deleteDatabase() {
  return request(indexedDB.deleteDatabase(DB_NAME));
}

function legacyDatabase() {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, 2);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      db.createObjectStore('entries', { keyPath: 'id' }).createIndex('at', 'at');
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

function upgradedDatabase() {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, DB_VERSION);
    opening.onupgradeneeded = (event) => upgradeDatabase(opening.result, opening.transaction, event.oldVersion);
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

test('v2 entries and pinned exercises migrate without deleting legacy stores', async () => {
  await deleteDatabase();
  const legacy = await legacyDatabase();
  const tx = legacy.transaction(['entries', 'meta'], 'readwrite');
  tx.objectStore('entries').put({
    id: 'set-1',
    at: '2026-08-01T10:00:00.000Z',
    exerciseId: 'squat',
    name: 'Squat',
    weight: 80,
    reps: 5,
    dayId: 'day-a',
  });
  tx.objectStore('meta').put({ key: 'pinned', value: [{ id: 'bench', name: 'Bench press' }] });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  legacy.close();

  const db = await upgradedDatabase();
  assert.equal(db.version, DB_VERSION);
  assert.equal(db.objectStoreNames.contains('entries'), true);
  assert.equal(db.objectStoreNames.contains('meta'), true);
  for (const name of Object.keys(STORES)) assert.equal(db.objectStoreNames.contains(name), true);

  const migrated = await request(db.transaction('sets').objectStore('sets').get('set-1'));
  assert.equal(migrated.sessionId, 'day-a');
  assert.equal(migrated.rpe, null);
  assert.equal(migrated.note, '');
  assert.deepEqual(
    await request(db.transaction('favourites').objectStore('favourites').get('bench')),
    { id: 'bench', name: 'Bench press' },
  );
  db.close();
  await deleteDatabase();
});

test('v1 nested completed workouts are flattened into the current set log', async () => {
  await deleteDatabase();
  const legacy = await new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, 1);
    opening.onupgradeneeded = () => {
      opening.result.createObjectStore('workouts', { keyPath: 'id' });
      opening.result.createObjectStore('routines', { keyPath: 'id' });
      opening.result.createObjectStore('records', { keyPath: 'exerciseId' });
      opening.result.createObjectStore('exercises', { keyPath: 'id' });
      opening.result.createObjectStore('meta', { keyPath: 'key' });
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
  const tx = legacy.transaction('workouts', 'readwrite');
  tx.objectStore('workouts').put({
    id: 'workout-1',
    startedAt: '2026-07-01T10:00:00.000Z',
    finishedAt: '2026-07-01T11:00:00.000Z',
    status: 'completed',
    exercises: [{
      exerciseId: 'bench',
      name: 'Bench press',
      sets: [
        { id: 'done-set', done: true, completedAt: '2026-07-01T10:30:00.000Z', weight: 70, reps: 8 },
        { id: 'unfinished-set', done: false, weight: 70, reps: 8 },
      ],
    }],
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  legacy.close();

  const db = await upgradedDatabase();
  const sets = await request(db.transaction('sets').objectStore('sets').getAll());
  assert.equal(sets.length, 1);
  assert.equal(sets[0].id, 'done-set');
  assert.equal(sets[0].weight, 70);
  assert.equal(sets[0].reps, 8);
  db.close();
  await deleteDatabase();
});

test('a fresh database creates every current store and required index', async () => {
  await deleteDatabase();
  const db = await upgradedDatabase();
  for (const [name, spec] of Object.entries(STORES)) {
    assert.equal(db.objectStoreNames.contains(name), true);
    const store = db.transaction(name).objectStore(name);
    for (const [indexName] of spec.indexes) assert.equal(store.indexNames.contains(indexName), true);
  }
  db.close();
  await deleteDatabase();
});

test('the current v3 data survives the v4 schema upgrade unchanged', async () => {
  await deleteDatabase();
  const legacy = await new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, 3);
    opening.onupgradeneeded = () => {
      for (const [name, spec] of Object.entries(STORES)) {
        const store = opening.result.createObjectStore(name, { keyPath: spec.key });
        for (const [indexName, path] of spec.indexes) store.createIndex(indexName, path);
      }
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
  const tx = legacy.transaction('sets', 'readwrite');
  tx.objectStore('sets').put({ id: 'keep-me', at: '2026-08-07T10:00:00.000Z', exerciseId: 'squat' });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  legacy.close();

  const db = await upgradedDatabase();
  const row = await request(db.transaction('sets').objectStore('sets').get('keep-me'));
  assert.equal(row.exerciseId, 'squat');
  db.close();
  await deleteDatabase();
});
