/**
 * IndexedDB persistence.
 * A single reused connection, promisified, with versioned migrations.
 * Falls back to memory when IndexedDB is unavailable (Safari in private
 * mode, locked-down WebViews): the app stays usable for this session.
 */

const DB_NAME = 'gymlog';
const DB_VERSION = 1;

export const STORES = {
  workouts: 'workouts',
  routines: 'routines',
  records: 'records',
  exercises: 'exercises',
  meta: 'meta',
};

let dbPromise = null;
let memoryFallback = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (event.oldVersion < 1) {
        const workouts = db.createObjectStore(STORES.workouts, { keyPath: 'id' });
        workouts.createIndex('startedAt', 'startedAt');
        db.createObjectStore(STORES.routines, { keyPath: 'id' });
        db.createObjectStore(STORES.records, { keyPath: 'exerciseId' });
        db.createObjectStore(STORES.exercises, { keyPath: 'id' });
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database blocked by another tab'));
  }).catch((error) => {
    console.warn('[gymlog] IndexedDB unusable, falling back to memory:', error);
    memoryFallback = new Map(Object.values(STORES).map((name) => [name, new Map()]));
    return null;
  });

  return dbPromise;
}

function memStore(storeName) {
  if (!memoryFallback.has(storeName)) memoryFallback.set(storeName, new Map());
  return memoryFallback.get(storeName);
}

function keyOf(storeName, value) {
  if (storeName === STORES.records) return value.exerciseId;
  if (storeName === STORES.meta) return value.key;
  return value.id;
}

function run(storeName, mode, operation) {
  return openDatabase().then((db) => {
    if (!db) return operation(null, memStore(storeName));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let result;

      Promise.resolve(operation(store, null))
        .then((value) => {
          result = value;
        })
        .catch(reject);

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAll(storeName) {
  return run(storeName, 'readonly', (store, mem) =>
    store ? request(store.getAll()) : [...mem.values()],
  );
}

export function get(storeName, key) {
  return run(storeName, 'readonly', (store, mem) =>
    store ? request(store.get(key)) : (mem.get(key) ?? undefined),
  );
}

export function put(storeName, value) {
  return run(storeName, 'readwrite', (store, mem) => {
    if (store) return request(store.put(value)).then(() => value);
    mem.set(keyOf(storeName, value), value);
    return value;
  });
}

export function putMany(storeName, values) {
  return run(storeName, 'readwrite', (store, mem) => {
    if (store) return Promise.all(values.map((v) => request(store.put(v))));
    values.forEach((v) => mem.set(keyOf(storeName, v), v));
    return values;
  });
}

export function remove(storeName, key) {
  return run(storeName, 'readwrite', (store, mem) => {
    if (store) return request(store.delete(key));
    mem.delete(key);
    return undefined;
  });
}

export function clear(storeName) {
  return run(storeName, 'readwrite', (store, mem) => {
    if (store) return request(store.clear());
    mem.clear();
    return undefined;
  });
}

/* Plain key/value for preferences and the in-progress session. */
export async function getMeta(key, fallback = null) {
  const row = await get(STORES.meta, key);
  return row === undefined || row === null ? fallback : row.value;
}

export function setMeta(key, value) {
  return put(STORES.meta, { key, value });
}

/**
 * Asks the browser not to evict our data under storage pressure.
 * Without this, months of training can vanish silently.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* not critical */
  }
  return false;
}
