/**
 * The seam for Firebase / Supabase / REST, wired but deliberately inert.
 *
 * Every write goes through here and lands in an outbox alongside the local
 * write. Today the adapter is `local`, which drains the outbox to nothing.
 * Swapping in a real backend means writing one object with these four
 * methods and registering it — no feature module changes, because none of
 * them import anything but `queue`.
 */
import { repo } from './db.js';
import { emit } from '../core/bus.js';

const outbox = repo('outbox');

/** The contract a backend has to satisfy. */
export const contract = ['push', 'pull', 'auth', 'ready'];

const localAdapter = {
  name: 'local',
  ready: () => true,
  auth: async () => ({ anonymous: true }),
  push: async () => true, // nothing to push to; the device is the source of truth
  pull: async () => [],
};

let adapter = localAdapter;

export function use(next) {
  const missing = contract.filter((m) => typeof next[m] !== 'function');
  if (missing.length) throw new Error(`adapter incompleto: manca ${missing.join(', ')}`);
  adapter = next;
  emit('sync:adapter', next.name);
}

export function current() {
  return adapter.name;
}

/** Records an intent. Safe to call offline; drain() retries later. */
export async function queue(kind, payload) {
  if (adapter === localAdapter) return;
  await outbox.put({ id: crypto.randomUUID(), at: Date.now(), kind, payload });
}

export async function drain() {
  if (!adapter.ready() || !navigator.onLine) return { sent: 0 };
  const pending = await outbox.all();
  let sent = 0;

  for (const item of pending.sort((a, b) => a.at - b.at)) {
    try {
      await adapter.push(item.kind, item.payload);
      await outbox.remove(item.id);
      sent += 1;
    } catch {
      break; // preserve order: a failure stops the drain rather than skipping
    }
  }

  if (sent) emit('sync:drained', sent);
  return { sent };
}

/** Background Sync where supported, a plain online listener where not. */
export function watch() {
  window.addEventListener('online', drain);
  navigator.serviceWorker?.ready
    ?.then((reg) => reg.sync?.register('gymlog-sync'))
    .catch(() => {});
}
