/**
 * Progress. Three questions in order of usefulness: am I lifting more, am I
 * training consistently, am I neglecting something. Charts are inline SVG —
 * no library, and they inherit the theme tokens.
 */
import { el } from '../ui/el.js';
import { appbar, stat, blank } from '../ui/components.js';
import { state } from '../core/state.js';
import { volume, weeklyVolume, personalBests, muscleSplit, streak } from '../core/training.js';
import { exerciseById } from '../data/exercises.js';
import { go } from '../core/router.js';
import { compact, kg } from '../utils/num.js';
import { shortDate, startOfWeek } from '../utils/date.js';

export function render() {
  const sets = state.sets;

  if (!sets.length) {
    return {
      node: el(
        'div',
        null,
        appbar({ title: 'Progress', heading: 'Review your training trends', back: () => go('/') }),
        el(
          'main',
          { class: 'screen lg:max-w-4xl' },
          blank({ title: 'Nothing here yet', body: 'Complete your first workout to see training volume, personal bests, and muscle-group balance.' }),
        ),
      ),
    };
  }

  const weeks = weeklyVolume(sets, 8);
  const bests = personalBests(sets).slice(0, 8);
  const split = muscleSplit(sets, (id) => exerciseById(id)?.muscle).slice(0, 6);
  const thisWeek = sets.filter((s) => new Date(s.at) >= startOfWeek(new Date()));

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Progress', heading: 'Review your training trends', back: () => go('/') }),
      el(
        'main',
        { class: 'screen lg:grid lg:grid-cols-2 lg:gap-4' },

        el(
          'section',
          { class: 'tile grid grid-cols-3 gap-3 lg:col-span-2' },
          stat(compact(volume(thisWeek)), 'kg this week', { accent: true }),
          stat(String(thisWeek.length), 'sets'),
          stat(String(streak(sets)), 'day streak'),
        ),

        el(
          'section',
          { class: 'card mt-4 lg:mt-0 lg:col-span-2' },
          el('h2', { class: 'label mb-3' }, 'Weekly volume'),
          bars(weeks),
        ),

        el(
          'section',
          { class: 'card mt-4 lg:mt-0' },
          el('h2', { class: 'label mb-3' }, 'Volume by muscle group'),
          el(
            'div',
            { class: 'flex flex-col gap-2.5' },
            split.map((row) => {
              const pct = Math.round((row.volume / split[0].volume) * 100);
              return el(
                'div',
                null,
                el(
                  'div',
                  { class: 'flex justify-between text-sm mb-1' },
                  el('span', { class: 'font-bold' }, row.muscle),
                  el('span', { class: 'text-ink-3 num' }, `${compact(row.volume)} kg`),
                ),
                el(
                  'div',
                  { class: 'h-2 rounded-full bg-surface-2 overflow-hidden' },
                  el('div', { class: 'h-full bg-accent rounded-full', style: { width: `${pct}%` } }),
                ),
              );
            }),
          ),
        ),

        el(
          'section',
          { class: 'card mt-4 lg:mt-0' },
          el('h2', { class: 'label mb-3' }, 'Personal bests'),
          el(
            'div',
            { class: 'flex flex-col gap-2' },
            bests.map((b) =>
              el(
                'div',
                { class: 'flex items-center gap-3 py-2 border-b border-line last:border-0' },
                el('span', { class: 'flex-1 min-w-0 font-bold truncate' }, b.name),
                el('span', { class: 'num text-sm text-ink-2' }, `${kg(b.weight)} kg × ${b.reps}`),
                el('span', { class: 'num text-sm font-extrabold text-accent w-16 text-right' }, `${kg(b.oneRm)}`),
              ),
            ),
          ),
          el('p', { class: 'mt-3 text-xs text-ink-3' }, 'The final column is an estimated one-rep max using the Epley formula.'),
        ),
      ),
    ),
  };
}

/** Bars start at the baseline, gap between them is real space not padding. */
function bars(weeks) {
  const max = Math.max(1, ...weeks.map((w) => w.volume));
  const H = 120;

  return el(
    'div',
    { class: 'flex items-end gap-1.5 h-[140px]', role: 'img', 'aria-label': 'Training volume over the last eight weeks' },
    weeks.map((w) => {
      const h = Math.round((w.volume / max) * H);
      return el(
        'div',
        { class: 'flex-1 flex flex-col items-center gap-1.5 min-w-0' },
        el('div', {
          class: ['w-full rounded-t-md', w.volume ? 'bg-accent' : 'bg-surface-2'],
          style: { height: `${Math.max(3, h)}px` },
        }),
        el('span', { class: 'text-[10px] text-ink-3 num truncate w-full text-center' }, shortDate(w.from).slice(0, 5)),
      );
    }),
  );
}
