/**
 * Storage. One object store of entries, plus a scratch key/value store.
 *
 * Falls back to memory when IndexedDB is unavailable (Safari in private
 * mode, locked-down WebViews) so the app still works for the session.
 */

const DB_NAME = 'gymlog';
const DB_VERSION = 2;

export const ENTRIES = 'entries';
export const META = 'meta';

let dbPromise = null;
let memory = null;

function open() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // v1 stored a much more elaborate model. It is gone; anything it held
      // no longer maps onto a flat list of sets.
      for (const name of [...db.objectStoreNames]) {
        if (name !== ENTRIES && name !== META) db.deleteObjectStore(name);
      }
      if (!db.objectStoreNames.contains(ENTRIES)) {
        db.createObjectStore(ENTRIES, { keyPath: 'id' }).createIndex('at', 'at');
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' });
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
    memory = new Map([[ENTRIES, new Map()], [META, new Map()]]);
    return null;
  });

  return dbPromise;
}

function run(store, mode, operation) {
  return open().then((db) => {
    if (!db) return operation(null, memory.get(store));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      let result;
      Promise.resolve(operation(tx.objectStore(store), null))
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

const request = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export function all() {
  return run(ENTRIES, 'readonly', (store, mem) =>
    store ? request(store.getAll()) : [...mem.values()],
  );
}

export function put(entry) {
  return run(ENTRIES, 'readwrite', (store, mem) => {
    if (store) return request(store.put(entry)).then(() => entry);
    mem.set(entry.id, entry);
    return entry;
  });
}

export function remove(id) {
  return run(ENTRIES, 'readwrite', (store, mem) => {
    if (store) return request(store.delete(id));
    mem.delete(id);
    return undefined;
  });
}

export function clear() {
  return run(ENTRIES, 'readwrite', (store, mem) => {
    if (store) return request(store.clear());
    mem.clear();
    return undefined;
  });
}

export async function getMeta(key, fallback = null) {
  const row = await run(META, 'readonly', (store, mem) =>
    store ? request(store.get(key)) : mem.get(key),
  );
  return row == null ? fallback : row.value;
}

export function setMeta(key, value) {
  return run(META, 'readwrite', (store, mem) => {
    if (store) return request(store.put({ key, value }));
    mem.set(key, { key, value });
    return undefined;
  });
}

/** Ask the browser not to evict months of training under storage pressure. */
export async function persist() {
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
