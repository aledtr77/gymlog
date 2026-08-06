/** Date helpers. Monday-first, Italian labels. */

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

export const startOfWeek = (d) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export const daysBetween = (a, b) =>
  Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

export const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const dfLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
const dfShort = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit' });
const dfMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

export const longDate = (d) => dfLong.format(new Date(d));
export const shortDate = (d) => dfShort.format(new Date(d));
export const monthLabel = (d) => dfMonth.format(new Date(d));

export function dayLabel(d) {
  const gap = daysBetween(d, new Date());
  if (gap === 0) return 'Today';
  if (gap === 1) return 'Yesterday';
  if (gap < 7) return `${gap} days ago`;
  return longDate(d);
}

export function mmss(seconds) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function duration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}`;
}
