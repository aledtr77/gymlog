/**
 * A short list of practical training tools. App behaviour and data management
 * deliberately live in Settings, so this page stays useful to a beginner.
 */
import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, navRow, sheet, toast, stat } from '../ui/components.js';
import { state, logBody, prefs, setTemplate, activeTemplate } from '../core/state.js';
import { TEMPLATES } from '../data/programs.js';
import { go } from '../core/router.js';
import { volume } from '../core/training.js';
import * as calc from '../utils/calc.js';
import { kg, compact, parseNum } from '../utils/num.js';
import { dayLabel } from '../utils/date.js';

export function render() {
  const template = activeTemplate();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'More', heading: 'Useful training tools', back: () => go('/') }),
      el(
        'main',
        { class: 'screen more-screen lg:max-w-5xl' },
        el(
          'header',
          { class: 'mb-6 max-w-2xl' },
          el('h2', { class: 'text-2xl font-black tracking-tight lg:hidden' }, 'Useful training tools'),
          el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2 lg:mt-0' }, 'Everything here answers a practical training question. Choose what you need and ignore the rest.'),
        ),
        el(
          'div',
          { class: 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4' },
          toolCard('Training plan', `${template.name} · ${template.days} days per week`, 'See the workouts GymLog will rotate through.', 'calendar', openProgram),
          toolCard('Personal profile', personalProfileSummary(), 'Keep the basic details used by your training estimates up to date.', 'scale', openPersonalProfile),
          toolCard('Workout history', state.sets.length ? `${state.sets.length} logged sets` : 'No workouts logged yet', 'Review the weights and reps you have already completed.', 'trophy', openHistory),
          toolCard('Quick calculations', 'Strength estimate and barbell plates', 'Two simple calculators for questions that come up in the gym.', 'calculator', openCalculators),
        ),
        el(
          'button',
          { type: 'button', class: 'mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold text-ink-2 lg:hidden', onClick: () => go('/settings') },
          icon('settings', 'w-5 h-5'),
          'App settings',
        ),
      ),
    ),
  };
}

function personalProfileSummary() {
  const profile = prefs.get('profile') || {};
  const weight = state.body[0]?.weight || profile.weight;
  return weight && profile.height
    ? `${kg(weight)} kg · ${profile.height} cm · update measurements`
    : 'Add details for weight trends and calorie estimates';
}

function toolCard(title, meta, body, iconName, onClick) {
  return el(
    'button',
    { type: 'button', class: 'card group min-h-[156px] text-left transition hover:border-ink-3 hover:bg-surface-2 active:scale-[.99]', onClick },
    el(
      'span',
      { class: 'flex items-start gap-3' },
      el('span', { class: 'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent group-hover:bg-surface-3' }, icon(iconName, 'w-5 h-5')),
      el('span', { class: 'min-w-0 flex-1 pt-0.5' }, el('strong', { class: 'block text-base font-black' }, title), el('span', { class: 'mt-1 block text-xs font-bold text-accent' }, meta)),
      icon('next', 'mt-2 w-5 h-5 text-ink-3'),
    ),
    el('span', { class: 'mt-4 block text-sm leading-relaxed text-ink-2' }, body),
  );
}

/* --------------------------------------------------------------- program */

function openProgram() {
  const current = activeTemplate();
  let handle;
  handle = sheet({
    title: 'Training plan',
    body: el(
      'div',
      { class: 'flex flex-col gap-4' },
      el(
        'div',
        { class: 'rounded-2xl border border-accent/25 bg-accent/10 p-4' },
        el('h3', { class: 'font-extrabold' }, 'Build around consistency'),
        el('p', { class: 'mt-1.5 text-sm leading-relaxed text-ink-2' }, 'The best plan is one you can follow for months. If you are new or returning after a break, full-body training is a practical place to start. More days do not automatically mean better results.'),
        el('p', { class: 'mt-2 text-xs leading-relaxed text-ink-3' }, 'Starting loads are only suggestions. Reduce them whenever form or control begins to slip.'),
      ),
      current.id === 'custom'
        ? el(
            'article',
            { class: 'card border-accent bg-accent/5' },
            el('div', { class: 'flex items-center gap-2' }, el('h3', { class: 'font-black text-lg' }, 'My plan'), el('span', { class: 'chip chip-on ml-auto' }, 'Active')),
            el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2' }, `Set up for ${current.days} days per week, with ${current.sessions.reduce((total, session) => total + session.lifts.length, 0)} exercises across ${current.sessions.length} sessions.`),
            el('p', { class: 'mt-3 text-xs text-ink-3' }, 'Run the setup again from Settings to change exercises. Choosing a plan below will replace this one.'),
          )
        : null,
      TEMPLATES.map((t) =>
        el(
          'article',
          { class: ['card transition', t.id === current.id ? 'border-accent bg-accent/5' : ''] },
          el(
            'div',
            { class: 'flex flex-wrap items-center gap-2' },
            el('h3', { class: 'font-black text-lg' }, t.name),
            el('span', { class: 'chip' }, `${t.days} days/week`),
            t.id === current.id ? el('span', { class: 'chip chip-on ml-auto' }, 'Active') : null,
          ),
          el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2' }, t.bestFor),
          el(
            'dl',
            { class: 'mt-4 grid gap-2 text-sm' },
            el('div', { class: 'flex gap-3' }, el('dt', { class: 'label w-20 pt-0.5 shrink-0' }, 'Schedule'), el('dd', { class: 'text-ink-2 leading-snug' }, t.schedule)),
            el('div', { class: 'flex gap-3' }, el('dt', { class: 'label w-20 pt-0.5 shrink-0' }, 'Duration'), el('dd', { class: 'text-ink-2 leading-snug' }, t.duration)),
            el('div', { class: 'flex gap-3' }, el('dt', { class: 'label w-20 pt-0.5 shrink-0' }, 'Sessions'), el('dd', { class: 'text-ink-2 leading-snug' }, t.sessions.map((session) => session.name).join(' · '))),
          ),
          t.id === current.id
            ? el('p', { class: 'mt-4 text-sm font-bold text-accent' }, 'This plan is currently shaping your next workout.')
            : el(
                'button',
                {
                  type: 'button',
                  class: 'btn-ghost mt-4 w-full sm:w-auto',
                  onClick: () => {
                    setTemplate(t.id);
                    toast(`Plan selected: ${t.name}`, { variant: 'ok' });
                    handle.close();
                    go('/');
                  },
                },
                `Use ${t.name}`,
              ),
        ),
      ),
      el('p', { class: 'text-xs leading-relaxed text-ink-3' }, 'A general plan is not enough when pain, medical conditions, movement limitations, or injury recovery are involved. Seek guidance from a qualified professional.'),
    ),
  });
}

/* ----------------------------------------------------------- calculators */

function openPersonalProfile() {
  const saved = prefs.get('profile') || {};
  const draft = {
    sex: saved.sex || '',
    age: saved.age || '',
    height: saved.height || '',
    weight: state.body[0]?.weight || saved.weight || '',
  };
  let handle;

  const numberField = (key, label, { min, max, step = '1', placeholder }) => {
    const input = el('input', {
      type: 'number',
      inputmode: 'decimal',
      class: 'field',
      min: String(min),
      max: String(max),
      step,
      value: draft[key],
      placeholder,
      onInput: (event) => { draft[key] = event.target.value; },
    });
    return el('label', { class: 'flex flex-col gap-1.5' }, el('span', { class: 'label' }, label), input);
  };

  const sex = el(
    'select',
    { class: 'field', onChange: (event) => { draft.sex = event.target.value; } },
    el('option', { value: '', selected: !draft.sex }, 'Select'),
    el('option', { value: 'f', selected: draft.sex === 'f' }, 'Female'),
    el('option', { value: 'm', selected: draft.sex === 'm' }, 'Male'),
  );

  const firstWeight = state.body.at(-1)?.weight;
  const currentWeight = state.body[0]?.weight;
  const change = firstWeight && currentWeight ? Math.round((currentWeight - firstWeight) * 10) / 10 : null;

  handle = sheet({
    title: 'Personal profile',
    body: el(
      'div',
      { class: 'flex flex-col gap-5' },
      el(
        'section',
        { class: 'rounded-xl3 border border-accent/25 bg-accent/10 p-5' },
        el('div', { class: 'w-10 h-10 grid place-items-center rounded-xl bg-accent text-accent-ink' }, icon('scale', 'w-5 h-5')),
        el('h3', { class: 'mt-4 text-xl font-black tracking-tight' }, 'Details that improve your estimates'),
        el('p', { class: 'mt-1.5 text-sm leading-relaxed text-ink-2' }, 'GymLog uses these values for weight trends, BMI context, energy calculations, and workout calorie estimates. They never leave this device.'),
      ),
      currentWeight
        ? el(
            'section',
            { class: 'tile grid grid-cols-2 gap-4' },
            stat(kg(currentWeight), 'current kg', { accent: true }),
            stat(change === null ? '—' : `${change > 0 ? '+' : ''}${change}`, 'change since first log'),
          )
        : null,
      el(
        'section',
        { class: 'card' },
        el('h3', { class: 'font-extrabold mb-4' }, 'Your details'),
        el(
          'div',
          { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          el('label', { class: 'flex flex-col gap-1.5' }, el('span', { class: 'label' }, 'Sex used by energy formulas'), sex),
          numberField('age', 'Age', { min: 14, max: 100, placeholder: 'e.g. 30' }),
          numberField('height', 'Height (cm)', { min: 120, max: 230, placeholder: 'e.g. 175' }),
          numberField('weight', 'Current weight (kg)', { min: 30, max: 300, step: '0.1', placeholder: 'e.g. 75' }),
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn-primary w-full mt-4',
            onClick: async () => {
              const profile = normalizeProfile(draft);
              if (!validProfile(profile)) return toast('Complete every field with a valid value', { variant: 'err' });
              const previousWeight = state.body[0]?.weight || saved.weight;
              prefs.set({ profile });
              if (Number(previousWeight) !== profile.weight) await logBody({ weight: profile.weight });
              handle.close();
              go('/more');
              toast('Personal profile updated', { variant: 'ok' });
            },
          },
          'Save personal profile',
        ),
      ),
      state.body.length > 1
        ? el(
            'section',
            { class: 'card' },
            el('h3', { class: 'font-extrabold' }, 'Recent weight entries'),
            el('p', { class: 'mt-1 text-xs text-ink-3' }, 'Use the same weighing conditions and focus on the trend.'),
            el('div', { class: 'mt-3' }, state.body.slice(0, 8).map((entry) => el('div', { class: 'flex items-center justify-between py-2.5 border-b border-line last:border-0' }, el('span', { class: 'text-sm text-ink-2' }, dayLabel(entry.at)), el('strong', { class: 'num' }, `${kg(entry.weight)} kg`)))),
          )
        : null,
    ),
  });
}

function normalizeProfile(profile) {
  return { sex: profile.sex, age: Number(profile.age), height: Number(profile.height), weight: Number(profile.weight) };
}

function validProfile(profile) {
  return ['f', 'm'].includes(profile.sex)
    && profile.age >= 14 && profile.age <= 100
    && profile.height >= 120 && profile.height <= 230
    && profile.weight >= 30 && profile.weight <= 300;
}

function openCalculators() {
  sheet({
    title: 'Quick calculations',
    body: el(
      'div',
      { class: 'flex flex-col gap-3' },
      el('p', { class: 'text-sm leading-relaxed text-ink-2' }, 'Two practical tools for common questions during strength training.'),
      [
        ['Estimated one-rep max', 'Estimate maximal strength from a set you have already performed.', oneRmCalc],
        ['Barbell plates', 'Work out which plates to load on each side.', platesCalc],
      ].map(([label, sub, open]) => navRow({ title: label, sub, iconName: 'calculator', onClick: open })),
    ),
  });
}

/** Small helper so each calculator is a form plus a live result panel. */
function calcSheet(title, fields, compute, { intro = null } = {}) {
  const out = el('div', { class: 'tile mt-4' });
  const inputs = {};

  const run = () => {
    const values = Object.fromEntries(
      Object.entries(inputs).map(([k, node]) => [k, node.type === 'number' ? parseNum(node.value) : node.value]),
    );
    out.replaceChildren(...[compute(values)].flat().filter(Boolean));
  };

  const form = el(
    'div',
    { class: 'flex flex-col gap-3' },
    fields.map((f) => {
      const node =
        f.options
          ? el(
              'select',
              { class: 'field', onChange: run },
              f.options.map((o) => el('option', { value: o.value, selected: f.value === o.value }, o.label)),
            )
          : el('input', {
              type: 'number',
              inputmode: 'decimal',
              step: f.step || '0.1',
              class: 'field',
              placeholder: f.label,
              value: f.value ?? '',
              onInput: run,
            });
      inputs[f.key] = node;
      return el('label', { class: 'flex flex-col gap-1.5' }, el('span', { class: 'label' }, f.label), node);
    }),
  );

  run();
  sheet({
    title,
    body: el(
      'div',
      null,
      intro ? el('div', { class: 'mb-5 text-sm leading-relaxed text-ink-2' }, intro) : null,
      form,
      out,
    ),
  });
}

const line = (label, value, accent = false) =>
  el(
    'div',
    { class: 'flex justify-between py-1.5' },
    el('span', { class: 'text-sm text-ink-2' }, label),
    el('span', { class: ['font-extrabold num', accent && 'text-accent'] }, value),
  );

function oneRmCalc() {
  calcSheet(
    '1RM and percentages',
    [
      { key: 'weight', label: 'Weight lifted (kg)' },
      { key: 'reps', label: 'Completed reps', step: '1' },
    ],
    ({ weight, reps }) => {
      const orm = calc.oneRepMax(weight, reps);
      if (!orm) return el('p', { class: 'text-sm text-ink-3' }, 'Enter weight and reps.');
      return [
        line('Estimated one-rep max', `${kg(orm)} kg`, true),
        el('div', { class: 'h-px bg-line my-2' }),
        ...calc.loadTable(orm).map((r) => line(`${r.pct}% · about ${r.reps} reps`, `${kg(r.weight)} kg`)),
        el('p', { class: 'text-xs text-ink-3 mt-3' }, 'Epley formula. This is an estimate, not a maximal test.'),
      ];
    },
    { intro: 'Use a challenging set performed with clean technique, ideally between 2 and 10 reps. Longer sets produce less reliable estimates, and you do not need to attempt a true max.' },
  );
}

function platesCalc() {
  calcSheet(
    'Barbell plates',
    [
      { key: 'target', label: 'Target total weight (kg)' },
      { key: 'bar', label: 'Bar weight (kg)', value: 20 },
    ],
    ({ target, bar }) => {
      const r = calc.plates(target, bar ?? 20);
      if (!r.ok) return el('p', { class: 'text-sm text-danger' }, r.error);
      return [
        el('p', { class: 'label mb-2' }, 'Per side'),
        ...r.plates.map((p) => line(`${kg(p.plate)} kg`, `× ${p.count}`)),
        r.error ? el('p', { class: 'text-sm text-warn mt-2' }, r.error) : null,
        line('Loadable total', `${kg(r.achieved)} kg`, true),
      ];
    },
    { intro: 'Enter the total weight including the bar. The result shows which plates to load on each side.' },
  );
}

/* --------------------------------------------------------------- history */

function openHistory() {
  const byDay = new Map();
  for (const s of state.sets) {
    const key = new Date(s.at).toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(s);
  }

  sheet({
    title: 'Workout history',
    body: byDay.size
      ? el(
          'div',
          { class: 'flex flex-col gap-5' },
          [...byDay.entries()].map(([, sets]) =>
            el(
              'section',
              null,
              el(
                'div',
                { class: 'flex justify-between items-baseline pb-1.5 border-b border-line' },
                el('span', { class: 'font-extrabold capitalize' }, dayLabel(sets[0].at)),
                el('span', { class: 'text-xs font-bold text-accent num' }, `${compact(volume(sets))} kg`),
              ),
              el(
                'div',
                { class: 'mt-1' },
                sets
                  .slice()
                  .reverse()
                  .map((s) =>
                    el(
                      'div',
                      { class: 'flex justify-between py-1.5 text-sm' },
                      el('span', { class: 'truncate flex-1 min-w-0' }, s.name),
                      el('span', { class: 'num text-ink-2 ml-3' }, `${kg(s.weight)} kg × ${s.reps}`),
                    ),
                  ),
              ),
            ),
          ),
        )
      : el('p', { class: 'text-sm text-ink-3' }, 'No workouts logged yet.'),
  });
}
