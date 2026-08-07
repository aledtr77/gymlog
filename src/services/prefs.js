/** Small synchronous preferences, versioned independently from IndexedDB. */
const KEY = 'gymlog.prefs';
export const PREFS_VERSION = 2;

export const DEFAULTS = Object.freeze({
  theme: 'system',
  units: 'kg',
  sound: true,
  vibration: true,
  keepAwake: true,
  restDefault: 90,
  onboarded: false,
  level: 'beginner',
  split: 'full-body',
  trainingDays: 3,
  template: null,
  profile: {
    sex: '',
    age: null,
    height: null,
    weight: null,
  },
  customTemplate: null,
});

let cache = null;
let durable = true;

const oneOf = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const finiteOrNull = (value) => value === null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;

export function normalizePreferences(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const profile = source.profile && typeof source.profile === 'object' ? source.profile : {};
  const sex = profile.sex === 'male' ? 'm' : profile.sex === 'female' ? 'f' : profile.sex;

  return {
    theme: oneOf(source.theme, ['system', 'dark', 'light'], DEFAULTS.theme),
    units: oneOf(source.units, ['kg', 'lb'], DEFAULTS.units),
    sound: typeof source.sound === 'boolean' ? source.sound : DEFAULTS.sound,
    vibration: typeof source.vibration === 'boolean' ? source.vibration : DEFAULTS.vibration,
    keepAwake: typeof source.keepAwake === 'boolean' ? source.keepAwake : DEFAULTS.keepAwake,
    restDefault: Number.isFinite(Number(source.restDefault)) && Number(source.restDefault) >= 15
      ? Number(source.restDefault)
      : DEFAULTS.restDefault,
    onboarded: typeof source.onboarded === 'boolean' ? source.onboarded : DEFAULTS.onboarded,
    level: oneOf(source.level, ['beginner', 'intermediate', 'advanced'], DEFAULTS.level),
    split: typeof source.split === 'string' && source.split ? source.split : DEFAULTS.split,
    trainingDays: Number.isInteger(Number(source.trainingDays)) && Number(source.trainingDays) >= 1 && Number(source.trainingDays) <= 7
      ? Number(source.trainingDays)
      : DEFAULTS.trainingDays,
    template: typeof source.template === 'string' && source.template ? source.template : null,
    profile: {
      sex: oneOf(sex, ['', 'm', 'f'], DEFAULTS.profile.sex),
      age: finiteOrNull(profile.age),
      height: finiteOrNull(profile.height),
      weight: finiteOrNull(profile.weight),
    },
    customTemplate: source.customTemplate && typeof source.customTemplate === 'object'
      ? structuredClone(source.customTemplate)
      : null,
  };
}

/** Accepts both the old raw object and the new { version, data } envelope. */
export function migratePreferences(stored) {
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && 'data' in stored) {
    if (Number(stored.version) > PREFS_VERSION) {
      throw new Error('Preferences were created by a newer GymLog version');
    }
    return normalizePreferences(stored.data);
  }
  return normalizePreferences(stored);
}

function write(value) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: PREFS_VERSION, data: value }));
    durable = true;
    return true;
  } catch (error) {
    durable = false;
    console.warn('[prefs] preferences are only available for this session:', error);
    return false;
  }
}

function read() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = migratePreferences(raw ? JSON.parse(raw) : {});
    if (raw) write(cache); // Persist the normalized/versioned representation.
  } catch (error) {
    console.warn('[prefs] invalid preferences; defaults restored:', error);
    cache = normalizePreferences();
    write(cache);
  }
  return cache;
}

export function get(key) {
  const current = read();
  return key ? structuredClone(current[key]) : structuredClone(current);
}

export function set(patch) {
  cache = normalizePreferences({ ...read(), ...patch });
  write(cache);
  return get();
}

export function replace(value) {
  cache = normalizePreferences(value);
  if (!write(cache)) throw new Error('Preferences could not be saved');
  return get();
}

export function preferencesStatus() {
  read();
  return { durable, version: PREFS_VERSION };
}
