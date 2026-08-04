/**
 * Calcolatore dischi.
 * Greedy sui dischi disponibili, con gestione esplicita del residuo:
 * in palestra è normale non poter comporre un peso esatto e l'app deve
 * dirlo invece di mentire.
 */

export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
export const BAR_WEIGHTS = [
  { value: 20, label: '20 kg · olimpico' },
  { value: 15, label: '15 kg · olimpico donna' },
  { value: 10, label: '10 kg · tecnico' },
  { value: 7.5, label: '7,5 kg · EZ curl' },
  { value: 0, label: 'Nessun bilanciere' },
];

const EPS = 1e-6;

/**
 * @param {number} targetWeight peso totale desiderato (bilanciere incluso)
 * @param {number} barWeight    peso del bilanciere
 * @param {number[]} available  dischi disponibili, per lato, illimitati
 * @returns {{
 *   ok: boolean, error: string|null, sideWeight: number,
 *   plates: {weight:number,count:number}[],
 *   achievedTotal: number, remainderPerSide: number
 * }}
 */
export function calculatePlates(
  targetWeight,
  barWeight = 20,
  available = DEFAULT_PLATES,
) {
  const target = Number(targetWeight);
  const bar = Number(barWeight) || 0;

  if (!Number.isFinite(target) || target <= 0) {
    return fail('Inserisci un peso valido.', bar);
  }

  if (target < bar - EPS) {
    return fail(
      `Il peso richiesto è inferiore al bilanciere (${formatKg(bar)} kg).`,
      bar,
    );
  }

  const sideWeight = round2((target - bar) / 2);

  if (sideWeight < EPS) {
    return {
      ok: true,
      error: null,
      sideWeight: 0,
      plates: [],
      achievedTotal: bar,
      remainderPerSide: 0,
    };
  }

  const sorted = [...available].filter((p) => p > 0).sort((a, b) => b - a);
  let remaining = sideWeight;
  const plates = [];

  for (const plate of sorted) {
    const count = Math.floor((remaining + EPS) / plate);
    if (count > 0) {
      plates.push({ weight: plate, count });
      remaining = round2(remaining - plate * count);
    }
  }

  const loadedPerSide = round2(sideWeight - remaining);

  return {
    ok: true,
    error:
      remaining > EPS
        ? `Combinazione esatta impossibile: mancano ${formatKg(remaining)} kg per lato.`
        : null,
    sideWeight,
    plates,
    achievedTotal: round2(bar + loadedPerSide * 2),
    remainderPerSide: remaining,
  };
}

function fail(error, bar) {
  return {
    ok: false,
    error,
    sideWeight: 0,
    plates: [],
    achievedTotal: bar,
    remainderPerSide: 0,
  };
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formattazione italiana: virgola decimale, niente ".0" inutili. */
export function formatKg(value) {
  const n = Number(value) || 0;
  const str = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return str.replace('.', ',');
}

export const PLATE_COLORS = {
  25: '#e8452e',
  20: '#3f7be0',
  15: '#f0c419',
  10: '#3fae5a',
  5: '#e6e9ee',
  2.5: '#b2b8c2',
  1.25: '#8b929e',
  1: '#7b828e',
  0.5: '#6d7684',
};
