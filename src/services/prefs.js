/**
 * LocalStorage for small synchronous settings only — theme, units, the
 * active session pointer. Anything that grows without bound lives in
 * IndexedDB instead, because LocalStorage is synchronous and blocks paint.
 */
const KEY = 'gymlog.prefs';

const DEFAULTS = {
  theme: 'system',
  units: 'kg',
  sound: true,
  vibration: true,
  keepAwake: true,
  restDefault: 90,
  onboarded: false,
  level: 'beginner',
  trainingDays: 3,
  customTemplate: null,
};

let cache = null;

function read() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function get(key) {
  return key ? read()[key] : { ...read() };
}

export function set(patch) {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode: settings simply do not persist */
  }
  return cache;
}
