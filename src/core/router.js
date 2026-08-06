/**
 * Hash router with lazy-loaded routes.
 *
 * Routes hold an importer rather than a module, so only the screen you open
 * is ever downloaded: the dashboard does not pay for the calculators.
 * The system back button walks the app instead of leaving it.
 */
import { emit } from './bus.js';

const routes = new Map();
let current = null;
let outlet = null;
let notFound = null;

export function define(path, loader) {
  routes.set(path, loader);
}

export function setNotFound(loader) {
  notFound = loader;
}

export function start(mountPoint) {
  outlet = mountPoint;
  window.addEventListener('hashchange', resolve);
  return resolve();
}

export function go(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) return resolve();
  if (replace) location.replace(target);
  else location.hash = target;
  return undefined;
}

export function back() {
  history.length > 1 ? history.back() : go('/');
}

export function currentPath() {
  return location.hash.slice(1) || '/';
}

/** Re-runs the current route. Screens are cheap to rebuild, so state
    changes redraw rather than each feature hand-patching its own DOM. */
export function refresh() {
  return resolve();
}

/** Matches "/exercise/:id" style patterns. */
function match(path) {
  for (const [pattern, loader] of routes) {
    const keys = [];
    const rx = new RegExp(
      `^${pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1));
        return '([^/]+)';
      })}$`,
    );
    const found = path.match(rx);
    if (found) {
      const params = Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(found[i + 1])]));
      return { loader, params };
    }
  }
  return notFound ? { loader: notFound, params: {} } : null;
}

async function resolve() {
  const path = currentPath();
  const hit = match(path);
  if (!hit || !outlet) return;

  current?.destroy?.();
  const module = await hit.loader();
  const view = await module.render({ params: hit.params, path });
  current = view;

  outlet.replaceChildren(view.node ?? view);
  window.scrollTo({ top: 0 });
  emit('route', path);
}
