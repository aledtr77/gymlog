import test from 'node:test';
import assert from 'node:assert/strict';
import * as calc from '../src/utils/calc.js';

test('BMI classifies and warns about its own limits', () => {
  const r = calc.bmi(75, 175);
  assert.equal(r.value, 24.5);
  assert.equal(r.band, 'healthy range');
  assert.match(r.caveat, /muscle/);
  assert.equal(calc.bmi(0, 175), null);
});

test('BMR follows Mifflin-St Jeor and differs by sex', () => {
  const m = calc.bmr({ weight: 80, height: 180, age: 30, sex: 'm' });
  const f = calc.bmr({ weight: 80, height: 180, age: 30, sex: 'f' });
  assert.equal(m, 1780);
  assert.equal(f - m, -166);
  assert.equal(calc.bmr({ weight: 0 }), null);
});

test('TDEE scales the basal rate by activity', () => {
  assert.equal(calc.tdee(2000, 'sedentario'), 2400);
  assert.ok(calc.tdee(2000, 'atleta') > calc.tdee(2000, 'moderato'));
});

test('macros hit the calorie target and set protein per kilo', () => {
  const m = calc.macros(2500, 80, 'maintenance');
  assert.equal(m.protein, 144);
  const total = m.protein * 4 + m.fat * 9 + m.carbs * 4;
  assert.ok(Math.abs(total - m.calories) < 20, `${total} vs ${m.calories}`);
  assert.ok(calc.macros(2500, 80, 'fat-loss').calories < m.calories);
});

test('1RM table descends and stays under the max', () => {
  const orm = calc.oneRepMax(100, 5);
  const table = calc.loadTable(orm);
  assert.equal(table.length, 8);
  assert.ok(table[0].weight > table.at(-1).weight);
  assert.ok(table.every((r) => r.weight <= orm));
});

test('body fat needs the right measurements per sex', () => {
  assert.ok(calc.bodyFat({ sex: 'm', height: 180, neck: 38, waist: 85 }) > 0);
  assert.equal(calc.bodyFat({ sex: 'f', height: 165, neck: 32, waist: 70 }), null);
  assert.ok(calc.bodyFat({ sex: 'f', height: 165, neck: 32, waist: 70, hip: 95 }) > 0);
});

test('plates: exact combination, and honesty when there is none', () => {
  const ok = calc.plates(100, 20);
  assert.equal(ok.error, null);
  assert.equal(ok.achieved, 100);
  assert.equal(calc.plates(10, 20).ok, false);
  const odd = calc.plates(101, 20);
  assert.match(odd.error, /cannot be loaded/);
  assert.ok(odd.achieved < 101);
});
