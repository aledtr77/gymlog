import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePlates, formatKg } from '../src/core/plates.js';

test('combinazione classica: 100 kg su bilanciere olimpico', () => {
  const result = calculatePlates(100, 20);
  assert.equal(result.ok, true);
  assert.equal(result.error, null);
  assert.equal(result.sideWeight, 40);
  assert.deepEqual(result.plates, [
    { weight: 25, count: 1 },
    { weight: 15, count: 1 },
  ]);
  assert.equal(result.achievedTotal, 100);
});

test('greedy: usa i dischi più pesanti disponibili', () => {
  const result = calculatePlates(142.5, 20);
  assert.equal(result.sideWeight, 61.25);
  assert.deepEqual(result.plates, [
    { weight: 25, count: 2 },
    { weight: 10, count: 1 },
    { weight: 1.25, count: 1 },
  ]);
  assert.equal(result.remainderPerSide, 0);
});

test('solo bilanciere: nessun disco, nessun errore', () => {
  const result = calculatePlates(20, 20);
  assert.equal(result.ok, true);
  assert.deepEqual(result.plates, []);
  assert.equal(result.sideWeight, 0);
  assert.equal(result.achievedTotal, 20);
});

test('peso sotto il bilanciere: errore esplicito', () => {
  const result = calculatePlates(15, 20);
  assert.equal(result.ok, false);
  assert.match(result.error, /inferiore al bilanciere/);
  assert.deepEqual(result.plates, []);
});

test('peso non componibile: dichiara il residuo invece di arrotondare', () => {
  const result = calculatePlates(100.4, 20);
  assert.ok(result.remainderPerSide > 0);
  assert.match(result.error, /mancano/);
  // Il totale dichiarato è quello davvero caricabile, non quello richiesto.
  assert.ok(result.achievedTotal < 100.4);
});

test('inventario ridotto: si adatta ai dischi disponibili', () => {
  const result = calculatePlates(60, 20, [10, 5]);
  assert.equal(result.sideWeight, 20);
  assert.deepEqual(result.plates, [{ weight: 10, count: 2 }]);
  assert.equal(result.remainderPerSide, 0);
});

test('senza bilanciere (manubri): tutto il peso è su un lato per due', () => {
  const result = calculatePlates(40, 0);
  assert.equal(result.sideWeight, 20);
  assert.equal(result.achievedTotal, 40);
});

test('input non validi non producono NaN', () => {
  for (const bad of [0, -10, null, undefined, NaN, 'abc']) {
    const result = calculatePlates(bad, 20);
    assert.equal(result.ok, false);
    assert.equal(result.plates.length, 0);
    assert.ok(typeof result.error === 'string');
  }
});

test('nessun errore di virgola mobile sui mezzi dischi', () => {
  const result = calculatePlates(63.5, 20);
  assert.equal(result.sideWeight, 21.75);
  assert.equal(result.remainderPerSide, 0);
  const loaded = result.plates.reduce((sum, p) => sum + p.weight * p.count, 0);
  assert.equal(Math.round(loaded * 100) / 100, 21.75);
});

test('formattazione italiana dei pesi', () => {
  assert.equal(formatKg(20), '20');
  assert.equal(formatKg(2.5), '2,5');
  assert.equal(formatKg(1.25), '1,25');
});
