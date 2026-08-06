/** Number formatting and parsing, Italian conventions. */

const nf1 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

export const kg = (v) => nf1.format(Number(v) || 0);
export const int = (v) => nf0.format(Math.round(Number(v) || 0));

/** Big volumes shrink so a stat tile can never break its layout. */
export const compact = (v) => {
  const n = Number(v) || 0;
  return n >= 10000 ? `${nf1.format(n / 1000)}k` : nf0.format(Math.round(n));
};

/** Accepts both "82,5" and "82.5"; empty means empty, not zero. */
export function parseNum(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const round = (v, decimals = 2) => {
  const f = 10 ** decimals;
  return Math.round((Number(v) + Number.EPSILON) * f) / f;
};

/** Rounds to something you can actually load on a bar. */
export const loadable = (v, step = 2.5) => round(Math.round(v / step) * step, 2);
