/**
 * Persistenza su IndexedDB.
 * Una sola connessione riusata, promisificata, con migrazione versionata.
 * Fallback in memoria se IndexedDB non è disponibile (Safari in privata,
 * WebView bloccate): l'app resta usabile per la sessione corrente.
 */

const DB_NAME = 'forgia';
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
      reject(new Error('IndexedDB non disponibile'));
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
    request.onblocked = () => reject(new Error('Database bloccato da un altra scheda'));
  }).catch((error) => {
    console.warn('[forgia] IndexedDB non utilizzabile, uso memoria volatile:', error);
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

/* Chiave/valore semplice per preferenze e sessione in corso. */
export async function getMeta(key, fallback = null) {
  const row = await get(STORES.meta, key);
  return row === undefined || row === null ? fallback : row.value;
}

export function setMeta(key, value) {
  return put(STORES.meta, { key, value });
}

/**
 * Chiede al browser di non sfrattare i dati sotto pressione di spazio.
 * Senza questo, mesi di allenamenti possono sparire silenziosamente.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* non critico */
  }
  return false;
}
