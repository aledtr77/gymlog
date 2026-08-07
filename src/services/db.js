/** IndexedDB repository with explicit volatile fallback and atomic bulk restore. */
import { DB_NAME, DB_VERSION, STORES, DATA_STORES, upgradeDatabase } from './migrations.js';

export { DB_NAME, DB_VERSION, STORES, DATA_STORES };

let handle = null;
let memory = null;
const status = { mode: 'pending', persistent: null, error: null };

function initialiseMemory(error) {
  if (!memory) memory = new Map(Object.keys(STORES).map((name) => [name, new Map()]));
  status.mode = 'memory';
  status.persistent = false;
  status.error = error instanceof Error ? error.message : String(error);
  console.warn('[db] using volatile memory; data will be lost on reload:', error);
}

function open() {
  if (handle) return handle;

  handle = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let abandoned = false;
    request.onupgradeneeded = (event) => {
      upgradeDatabase(request.result, request.transaction, event.oldVersion);
    };
    request.onsuccess = () => {
      const db = request.result;
      if (abandoned) {
        db.close();
        return;
      }
      status.mode = 'indexeddb';
      status.error = null;
      db.onversionchange = () => {
        db.close();
        handle = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      abandoned = true;
      reject(request.error || new Error('Could not open IndexedDB'));
    };
    request.onblocked = () => {
      abandoned = true;
      reject(new Error('Database upgrade blocked by another GymLog tab'));
    };
  }).catch((error) => {
    initialiseMemory(error);
    return null;
  });

  return handle;
}

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });

function assertStore(name) {
  if (!(name in STORES)) throw new Error(`Unknown store: ${name}`);
}

async function transact(names, mode, work) {
  names.forEach(assertStore);
  const db = await open();

  if (!db) {
    const selected = new Map(names.map((name) => [name, memory.get(name)]));
    return work(null, selected);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let result;
    let workError = null;

    tx.oncomplete = () => (workError ? reject(workError) : resolve(result));
    tx.onerror = () => reject(tx.error || workError || new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || workError || new Error('IndexedDB transaction aborted'));

    try {
      const stores = new Map(names.map((name) => [name, tx.objectStore(name)]));
      Promise.resolve(work(stores, null))
        .then((value) => {
          result = value;
        })
        .catch((error) => {
          workError = error;
          try {
            tx.abort();
          } catch {
            reject(error);
          }
        });
    } catch (error) {
      workError = error;
      try {
        tx.abort();
      } catch {
        reject(error);
      }
    }
  });
}

function run(name, mode, work) {
  return transact([name], mode, (stores, mem) =>
    work(stores ? stores.get(name) : null, mem ? mem.get(name) : null),
  );
}

export const repo = (name) => {
  assertStore(name);
  const key = STORES[name].key;

  return {
    all: () => run(name, 'readonly', (store, mem) =>
      store ? requestResult(store.getAll()) : [...mem.values()],
    ),
    get: (id) => run(name, 'readonly', (store, mem) =>
      store ? requestResult(store.get(id)) : mem.get(id),
    ),
    put: (value) => run(name, 'readwrite', (store, mem) => {
      if (store) {
        store.put(value);
        return value;
      }
      mem.set(value[key], structuredClone(value));
      return value;
    }),
    putMany: (values) => run(name, 'readwrite', (store, mem) => {
      if (store) {
        values.forEach((value) => store.put(value));
        return values;
      }
      values.forEach((value) => mem.set(value[key], structuredClone(value)));
      return values;
    }),
    remove: (id) => run(name, 'readwrite', (store, mem) => {
      if (store) {
        store.delete(id);
        return undefined;
      }
      mem.delete(id);
      return undefined;
    }),
    clear: () => run(name, 'readwrite', (store, mem) => {
      if (store) {
        store.clear();
        return undefined;
      }
      mem.clear();
      return undefined;
    }),
  };
};

export async function readStores(names = DATA_STORES) {
  return transact(names, 'readonly', async (stores, mem) => {
    const pairs = await Promise.all(names.map(async (name) => [
      name,
      stores ? await requestResult(stores.get(name).getAll()) : [...mem.get(name).values()],
    ]));
    return Object.fromEntries(pairs);
  });
}

/** Merge or replace every backed-up aggregate in one IndexedDB transaction. */
export async function restoreStores(data, { mode = 'merge' } = {}) {
  if (!['merge', 'replace'].includes(mode)) throw new Error(`Unknown restore mode: ${mode}`);
  const names = DATA_STORES;

  return transact(names, 'readwrite', async (stores, mem) => {
    if (mem) {
      const snapshots = new Map(names.map((name) => [
        name,
        new Map([...mem.get(name)].map(([key, value]) => [key, structuredClone(value)])),
      ]));
      try {
        for (const name of names) {
          const target = mem.get(name);
          if (mode === 'replace') target.clear();
          for (const value of data[name] || []) {
            target.set(value[STORES[name].key], structuredClone(value));
          }
        }
      } catch (error) {
        for (const [name, snapshot] of snapshots) memory.set(name, snapshot);
        throw error;
      }
      return;
    }

    for (const name of names) {
      const target = stores.get(name);
      if (mode === 'replace') target.clear();
      for (const value of data[name] || []) target.put(value);
    }
  });
}

export function storageStatus() {
  return { ...status };
}

/** Ask the browser not to evict months of training under storage pressure. */
export async function persist() {
  if (status.mode === 'memory') return false;
  try {
    if (navigator.storage?.persist) {
      status.persistent = (await navigator.storage.persisted()) || (await navigator.storage.persist());
      return status.persistent;
    }
  } catch (error) {
    status.error ||= error instanceof Error ? error.message : String(error);
  }
  status.persistent = false;
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
