/** Italian-localised formatting helpers. */

const nfKg = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
const nfInt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

export function kg(value) {
  return nfKg.format(Number(value) || 0);
}

export function int(value) {
  return nfInt.format(Math.round(Number(value) || 0));
}

/** Large volumes: 12,480 kg becomes "12,5k" so the layout does not blow up. */
export function compactKg(value) {
  const n = Number(value) || 0;
  if (n >= 10000) return `${nfKg.format(n / 1000)}k`;
  return nfInt.format(n);
}

export function num(value) {
  // Careful: Number('') is 0, so the "empty field" case must be excluded
  // before converting, or an unfilled set would render as "0".
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

/** Lenient parsing: accepts both "82,5" and "82.5". */
export function parseNum(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function mmss(seconds) {
  const total = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function durationLabel(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const dfDay = new Intl.DateTimeFormat('it-IT', { day: '2-digit' });
const dfMon = new Intl.DateTimeFormat('it-IT', { month: 'short' });
const dfFull = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dfMonthYear = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
const dfTime = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });
const dfShort = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit' });

export const dayOf = (d) => dfDay.format(new Date(d));
export const monthOf = (d) => dfMon.format(new Date(d)).replace('.', '');
export const fullDate = (d) => dfFull.format(new Date(d));
export const monthYear = (d) => dfMonthYear.format(new Date(d));
export const timeOf = (d) => dfTime.format(new Date(d));
export const shortDate = (d) => dfShort.format(new Date(d));

export function relativeDay(date) {
  const target = startOfDay(new Date(date));
  const today = startOfDay(new Date());
  const days = Math.round((today - target) / 86400000);
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} giorni fa`;
  if (days < 14) return 'La scorsa settimana';
  return fullDate(date);
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday as the first day, following the Italian convention. */
export function startOfWeek(date) {
  const d = startOfDay(date);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Notte fonda';
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
