import test from 'node:test';
import assert from 'node:assert/strict';

import { calculatePlates, formatKg } from '../src/core/plates.js';

test('classic combination: 100 kg on an olympic bar', () => {
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

test('greedy: uses the heaviest plates available', () => {
  const result = calculatePlates(142.5, 20);
  assert.equal(result.sideWeight, 61.25);
  assert.deepEqual(result.plates, [
    { weight: 25, count: 2 },
    { weight: 10, count: 1 },
    { weight: 1.25, count: 1 },
  ]);
  assert.equal(result.remainderPerSide, 0);
});

test('bar only: no plates, no error', () => {
  const result = calculatePlates(20, 20);
  assert.equal(result.ok, true);
  assert.deepEqual(result.plates, []);
  assert.equal(result.sideWeight, 0);
  assert.equal(result.achievedTotal, 20);
});

test('weight below the bar: explicit error', () => {
  const result = calculatePlates(15, 20);
  assert.equal(result.ok, false);
  assert.match(result.error, /inferiore al bilanciere/);
  assert.deepEqual(result.plates, []);
});

test('unmakeable weight: reports the remainder instead of rounding', () => {
  const result = calculatePlates(100.4, 20);
  assert.ok(result.remainderPerSide > 0);
  assert.match(result.error, /mancano/);
  // The reported total is what can actually be loaded, not what was asked.
  assert.ok(result.achievedTotal < 100.4);
});

test('reduced inventory: adapts to the plates on hand', () => {
  const result = calculatePlates(60, 20, [10, 5]);
  assert.equal(result.sideWeight, 20);
  assert.deepEqual(result.plates, [{ weight: 10, count: 2 }]);
  assert.equal(result.remainderPerSide, 0);
});

test('no bar (dumbbells): the whole weight is one side, doubled', () => {
  const result = calculatePlates(40, 0);
  assert.equal(result.sideWeight, 20);
  assert.equal(result.achievedTotal, 40);
});

test('invalid input never produces NaN', () => {
  for (const bad of [0, -10, null, undefined, NaN, 'abc']) {
    const result = calculatePlates(bad, 20);
    assert.equal(result.ok, false);
    assert.equal(result.plates.length, 0);
    assert.ok(typeof result.error === 'string');
  }
});

test('no floating-point drift on half plates', () => {
  const result = calculatePlates(63.5, 20);
  assert.equal(result.sideWeight, 21.75);
  assert.equal(result.remainderPerSide, 0);
  const loaded = result.plates.reduce((sum, p) => sum + p.weight * p.count, 0);
  assert.equal(Math.round(loaded * 100) / 100, 21.75);
});

test('weight formatting stays compact and readable', () => {
  assert.equal(formatKg(20), '20');
  assert.equal(formatKg(2.5), '2,5');
  assert.equal(formatKg(1.25), '1,25');
});
