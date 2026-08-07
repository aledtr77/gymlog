import test from 'node:test';
import assert from 'node:assert/strict';
import { migratePreferences, normalizePreferences, PREFS_VERSION } from '../src/services/prefs.js';

test('legacy raw preferences are normalized and keep nested profile values', () => {
  const value = migratePreferences({ theme: 'dark', restDefault: 120, profile: { sex: 'm', age: 35 } });
  assert.equal(value.theme, 'dark');
  assert.equal(value.restDefault, 120);
  assert.equal(value.profile.sex, 'm');
  assert.equal(value.profile.age, 35);
  assert.equal(value.profile.height, null);
});

test('versioned preferences reject future formats', () => {
  assert.throws(
    () => migratePreferences({ version: PREFS_VERSION + 1, data: {} }),
    /newer GymLog version/,
  );
});

test('invalid preference values fall back without dropping a valid custom template', () => {
  const customTemplate = { id: 'mine', sessions: [{ id: 'a', lifts: [] }] };
  const value = normalizePreferences({ theme: 'neon', trainingDays: 99, customTemplate });
  assert.equal(value.theme, 'system');
  assert.equal(value.trainingDays, 3);
  assert.deepEqual(value.customTemplate, customTemplate);
  assert.notEqual(value.customTemplate, customTemplate);
});
