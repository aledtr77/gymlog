/** Versioned IndexedDB schema upgrades. Keep every step additive and idempotent. */

export const DB_NAME = 'gymlog';
export const DB_VERSION = 4;

export const STORES = {
  sets: { key: 'id', indexes: [['at', 'at'], ['exerciseId', 'exerciseId']] },
  sessions: { key: 'id', indexes: [['at', 'at']] },
  workouts: { key: 'id', indexes: [] },
  favourites: { key: 'id', indexes: [] },
  body: { key: 'id', indexes: [['at', 'at']] },
  goals: { key: 'id', indexes: [] },
  photos: { key: 'id', indexes: [['at', 'at']] },
  outbox: { key: 'id', indexes: [] },
};

export const DATA_STORES = Object.freeze(
  Object.keys(STORES).filter((name) => name !== 'outbox'),
);

function ensureSchema(db, transaction) {
  for (const [name, spec] of Object.entries(STORES)) {
    const store = db.objectStoreNames.contains(name)
      ? transaction.objectStore(name)
      : db.createObjectStore(name, { keyPath: spec.key });

    for (const [indexName, path] of spec.indexes) {
      if (!store.indexNames.contains(indexName)) store.createIndex(indexName, path);
    }
  }
}

function migrateLegacyEntries(db, transaction) {
  if (!db.objectStoreNames.contains('entries')) return;

  const source = transaction.objectStore('entries');
  const target = transaction.objectStore('sets');
  const cursor = source.openCursor();

  cursor.onsuccess = () => {
    const row = cursor.result;
    if (!row) return;
    const value = row.value || {};
    if (typeof value.id === 'string' && value.id) {
      target.put({
        ...value,
        at: value.at || new Date(0).toISOString(),
        exerciseId: value.exerciseId || 'unknown',
        name: value.name || value.exerciseId || 'Imported exercise',
        weight: Number(value.weight) || 0,
        reps: Number(value.reps) || 0,
        rpe: value.rpe ?? null,
        note: value.note || '',
        sessionId: value.sessionId ?? value.dayId ?? null,
      });
    }
    row.continue();
  };
}

function migrateLegacyPinned(db, transaction) {
  if (!db.objectStoreNames.contains('meta')) return;

  const request = transaction.objectStore('meta').get('pinned');
  const target = transaction.objectStore('favourites');
  request.onsuccess = () => {
    const pinned = request.result?.value;
    if (!Array.isArray(pinned)) return;
    for (const item of pinned) {
      if (item && typeof item.id === 'string' && item.id) {
        target.put({ id: item.id, name: item.name || item.id });
      }
    }
  };
}

function migrateLegacyWorkouts(db, transaction) {
  if (!db.objectStoreNames.contains('workouts')) return;

  const source = transaction.objectStore('workouts');
  const target = transaction.objectStore('sets');
  const cursor = source.openCursor();
  cursor.onsuccess = () => {
    const row = cursor.result;
    if (!row) return;
    const workout = row.value || {};
    for (const exercise of workout.exercises || []) {
      for (const set of exercise.sets || []) {
        if (!set?.done || typeof set.id !== 'string' || !set.id) continue;
        target.put({
          id: set.id,
          at: set.completedAt || workout.finishedAt || workout.startedAt || new Date(0).toISOString(),
          exerciseId: exercise.exerciseId || 'unknown',
          name: exercise.name || exercise.exerciseId || 'Imported exercise',
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0,
          rpe: set.rpe ?? null,
          note: exercise.notes || workout.notes || '',
          sessionId: null,
        });
      }
    }
    row.continue();
  };
}

/** Called only inside onupgradeneeded, where schema and data share one transaction. */
export function upgradeDatabase(db, transaction, oldVersion) {
  ensureSchema(db, transaction);

  // v1 stored completed sets nested inside workout/exercise blocks.
  if (oldVersion === 1) migrateLegacyWorkouts(db, transaction);

  // v2 used a flat `entries` log and `meta.pinned`. Preserve those stores,
  // copy their useful data, and let a later release remove them after field use.
  if (oldVersion > 0 && oldVersion < 3) {
    migrateLegacyEntries(db, transaction);
    migrateLegacyPinned(db, transaction);
  }
}
