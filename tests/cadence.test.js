import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyCadenceStatus } from '../src/features/dashboard.js';

test('weekly cadence reports a met goal', () => {
  assert.equal(weeklyCadenceStatus(3, 3, 4).label, 'Goal met');
});

test('weekly cadence stays on track while the goal is still reachable', () => {
  assert.equal(weeklyCadenceStatus(1, 3, 4).label, 'On track');
});

test('weekly cadence reports a missed goal only when it is no longer reachable', () => {
  assert.equal(weeklyCadenceStatus(0, 4, 5).label, 'Goal missed');
});
