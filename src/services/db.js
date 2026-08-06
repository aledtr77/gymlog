/**
 * IndexedDB, exposed as a tiny repository API.
 *
 * Nothing above this file knows IndexedDB exists. That is what makes the
 * sync seam in sync.js possible later: swap the implementation, keep the
 * five verbs. Falls back to memory when storage is unavailable (Safari in
 * private mode, locked-down WebViews) so the app degrades instead of dying.
 */

const NAME = 'gymlog';
const VERSION = 3;

/** One store per aggregate. Indexes exist only where a screen queries. */
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

let handle = null;
let memory = null;

function open() {
  if (handle) return handle;

  handle = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // v1/v2 held a different model; nothing there maps onto these stores.
      for (const name of [...db.objectStoreNames]) {
        if (!(name in STORES)) db.deleteObjectStore(name);
      }

      for (const [name, spec] of Object.entries(STORES)) {
        const store = db.objectStoreNames.contains(name)
          ? request.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: spec.key });
        for (const [indexName, path] of spec.indexes) {
          if (!store.indexNames.contains(indexName)) store.createIndex(indexName, path);
        }
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
    console.warn('[db] falling back to memory:', error);
    memory = new Map(Object.keys(STORES).map((name) => [name, new Map()]));
    return null;
  });

  return handle;
}

function run(store, mode, work) {
  return open().then((db) => {
    if (!db) return work(null, memory.get(store));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      let result;
      Promise.resolve(work(tx.objectStore(store), null))
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

const req = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** The five verbs everything above this layer is allowed to use. */
export const repo = (name) => ({
  all: () => run(name, 'readonly', (s, mem) => (s ? req(s.getAll()) : [...mem.values()])),

  get: (id) => run(name, 'readonly', (s, mem) => (s ? req(s.get(id)) : mem.get(id))),

  put: (value) =>
    run(name, 'readwrite', (s, mem) => {
      if (s) return req(s.put(value)).then(() => value);
      mem.set(value[STORES[name].key], value);
      return value;
    }),

  putMany: (values) =>
    run(name, 'readwrite', (s, mem) => {
      if (s) return Promise.all(values.map((v) => req(s.put(v))));
      values.forEach((v) => mem.set(v[STORES[name].key], v));
      return values;
    }),

  remove: (id) =>
    run(name, 'readwrite', (s, mem) => {
      if (s) return req(s.delete(id));
      mem.delete(id);
      return undefined;
    }),

  clear: () =>
    run(name, 'readwrite', (s, mem) => {
      if (s) return req(s.clear());
      mem.clear();
      return undefined;
    }),
});

/** Ask the browser not to evict months of training under storage pressure. */
export async function persist() {
  try {
    if (navigator.storage?.persist) {
      return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    }
  } catch {
    /* not critical */
  }
  return false;
}

export async function usage() {
  try {
    const { usage: used = 0, quota = 0 } = (await navigator.storage?.estimate?.()) || {};
    return { used, quota };
  } catch {
    return { used: 0, quota: 0 };
  }
}
