/**
 * Fitness calculators. Pure, unit-tested, and each one states the formula it
 * uses — these numbers get quoted at people, so the provenance matters.
 */

import { round } from './num.js';

/** BMI. Blunt instrument: it cannot tell muscle from fat, so we say so. */
export function bmi(kgWeight, cmHeight) {
  const m = (Number(cmHeight) || 0) / 100;
  if (m <= 0 || !kgWeight) return null;
  const value = round(kgWeight / (m * m), 1);
  const band =
    value < 18.5 ? 'underweight' : value < 25 ? 'healthy range' : value < 30 ? 'overweight' : 'obesity range';
  return { value, band, caveat: 'It cannot distinguish muscle from body fat and may overestimate risk in muscular people.' };
}

/** Mifflin–St Jeor: the resting burn, more accurate than Harris–Benedict. */
export function bmr({ weight, height, age, sex = 'm' }) {
  if (!weight || !height || !age) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(sex === 'f' ? base - 161 : base + 5);
}

export const ACTIVITY = [
  { id: 'sedentario', label: 'Sedentary', factor: 1.2, hint: 'Desk-based day, little exercise' },
  { id: 'leggero', label: 'Lightly active', factor: 1.375, hint: '1–3 workouts per week' },
  { id: 'moderato', label: 'Moderately active', factor: 1.55, hint: '3–5 workouts per week' },
  { id: 'intenso', label: 'Very active', factor: 1.725, hint: '6–7 workouts per week' },
  { id: 'atleta', label: 'Athlete', factor: 1.9, hint: 'Twice-daily training or physical work' },
];

export function tdee(bmrValue, activityId = 'moderato') {
  const activity = ACTIVITY.find((a) => a.id === activityId) || ACTIVITY[2];
  return bmrValue ? Math.round(bmrValue * activity.factor) : null;
}

/**
 * Macros from a calorie target. Protein is set per kilo of bodyweight
 * (~1.8 g/kg, the range the evidence supports for trainees), fat gets 25%
 * of calories, and carbohydrate takes the remainder.
 */
export function macros(calories, weight, goal = 'maintenance') {
  if (!calories || !weight) return null;
  const adjusted =
    goal === 'fat-loss' ? Math.round(calories * 0.8)
      : goal === 'muscle-gain' ? Math.round(calories * 1.1)
        : calories;

  const protein = Math.round(weight * 1.8);
  const fat = Math.round((adjusted * 0.25) / 9);
  const carbs = Math.max(0, Math.round((adjusted - protein * 4 - fat * 9) / 4));

  return { calories: adjusted, protein, fat, carbs };
}

/** Epley, and the percentage table people actually program from. */
export function oneRepMax(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return round(r === 1 ? w : w * (1 + r / 30), 1);
}

export const PERCENTAGES = [95, 90, 85, 80, 75, 70, 65, 60];

export function loadTable(oneRm) {
  const repsAt = { 95: 2, 90: 4, 85: 6, 80: 8, 75: 10, 70: 12, 65: 15, 60: 18 };
  return PERCENTAGES.map((pct) => ({
    pct,
    weight: round((oneRm * pct) / 100, 1),
    reps: repsAt[pct],
  }));
}

/**
 * Body fat by the US Navy tape method. Needs a tape measure, not calipers,
 * which is why it is the one worth shipping.
 */
export function bodyFat({ sex = 'm', height, neck, waist, hip }) {
  if (!height || !neck || !waist) return null;
  const log10 = Math.log10;

  const value =
    sex === 'f'
      ? hip
        ? 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.221 * log10(height)) - 450
        : null
      : 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450;

  if (value === null || !Number.isFinite(value)) return null;
  return round(Math.max(2, Math.min(60, value)), 1);
}

/** Plates per side, and honest about what cannot be made exactly. */
export function plates(target, bar = 20, available = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  const total = Number(target) || 0;
  if (total < bar) return { ok: false, error: `Below the empty bar weight (${bar} kg)`, plates: [] };

  let side = round((total - bar) / 2, 2);
  const out = [];

  for (const plate of [...available].sort((a, b) => b - a)) {
    const count = Math.floor((side + 1e-6) / plate);
    if (count > 0) {
      out.push({ plate, count });
      side = round(side - plate * count, 2);
    }
  }

  return {
    ok: true,
    plates: out,
    remainder: side,
    achieved: round(total - side * 2, 2),
    error: side > 1e-6 ? `${side} kg per side cannot be loaded with the available plates` : null,
  };
}
