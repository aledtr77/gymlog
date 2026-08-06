/** Number and date formatting, Italian conventions. */

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

/** Weights: no pointless ".0", comma as the decimal separator. */
export function kg(value) {
  return nf.format(Number(value) || 0);
}

/** Big volumes shrink so they cannot break the layout. */
export function compact(value) {
  const n = Number(value) || 0;
  return n >= 10000 ? `${nf.format(n / 1000)}k` : nf.format(Math.round(n));
}

export function mmss(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const dfFull = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function dayLabel(date) {
  const target = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(target, today)) return 'Oggi';
  if (same(target, yesterday)) return 'Ieri';
  return dfFull.format(target);
}

export function timeOf(date) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(date),
  );
}
