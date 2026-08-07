/**
 * Progress. Three questions in order of usefulness: am I lifting more, am I
 * training consistently, am I neglecting something. Charts are inline SVG —
 * no library, and they inherit the theme tokens.
 */
import { el } from '../ui/el.js';
import { appbar, stat, blank, workspace, groupHeading } from '../ui/components.js';
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
          { class: 'screen progress-screen' },
          workspace({
            iconName: 'chart',
            title: 'Your progress',
            body: 'Training trends will appear here after your first completed workout.',
            content: blank({ title: 'Nothing here yet', body: 'Complete your first workout to see training volume, personal bests, and muscle-group balance.' }),
          }),
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
        { class: 'screen progress-screen' },
        workspace({
          iconName: 'chart',
          title: 'Training overview',
          body: 'See whether your work is becoming more consistent, balanced, and strong over time.',
          action: el('span', { class: 'chip' }, `${sets.length} sets logged`),
          content: el(
            'div',
            { class: 'progress-layout' },
            el(
              'section',
              { class: 'progress-summary' },
              stat(compact(volume(thisWeek)), 'kg this week', { accent: true }),
              stat(String(thisWeek.length), 'sets'),
              stat(String(streak(sets)), 'day streak'),
            ),
            el(
              'section',
              { class: 'surface-group progress-chart' },
              groupHeading({ iconName: 'chart', title: 'Weekly volume', body: 'Total weight moved across the last eight weeks.' }),
              el('div', { class: 'mt-5' }, bars(weeks)),
            ),
            el(
              'section',
              { class: 'surface-group progress-detail' },
              groupHeading({ iconName: 'dumbbell', title: 'Muscle balance', body: 'Relative training volume by muscle group.' }),
              el(
                'div',
                { class: 'mt-5 flex flex-col gap-3' },
                split.map((row) => {
                  const pct = Math.round((row.volume / split[0].volume) * 100);
                  return el(
                    'div',
                    null,
                    el('div', { class: 'mb-1 flex justify-between text-sm' }, el('span', { class: 'font-bold' }, row.muscle), el('span', { class: 'num text-ink-3' }, `${compact(row.volume)} kg`)),
                    el('div', { class: 'h-2 overflow-hidden rounded-full bg-surface-2' }, el('div', { class: 'h-full rounded-full bg-accent', style: { width: `${pct}%` } })),
                  );
                }),
              ),
            ),
            el(
              'section',
              { class: 'surface-group progress-detail' },
              groupHeading({ iconName: 'trophy', title: 'Personal bests', body: 'Your strongest logged performances.' }),
              el(
                'div',
                { class: 'mt-4' },
                bests.map((b) => el('div', { class: 'flex items-center gap-3 border-b border-line py-2.5 last:border-0' }, el('span', { class: 'min-w-0 flex-1 truncate font-bold' }, b.name), el('span', { class: 'num text-sm text-ink-2' }, `${kg(b.weight)} kg × ${b.reps}`), el('span', { class: 'num w-16 text-right text-sm font-extrabold text-accent' }, `${kg(b.oneRm)}`))),
              ),
              el('p', { class: 'mt-3 text-xs text-ink-3' }, 'Final column: estimated one-rep max.'),
            ),
          ),
        }),
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
