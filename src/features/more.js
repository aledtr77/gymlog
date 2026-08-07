/**
 * Secondary training tools and app preferences live here. Personal profile
 * data and body-weight tracking belong to the dashboard, where their effect
 * on the plan and estimates stays visible.
 */
import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, navRow, sheet, toast, stat } from '../ui/components.js';
import { state, logBody, prefs, setTemplate, activeTemplate } from '../core/state.js';
import { TEMPLATES } from '../data/programs.js';
import { go } from '../core/router.js';
import { volume } from '../core/training.js';
import * as calc from '../utils/calc.js';
import { files, share, clipboard, net } from '../platform/index.js';
import { usage } from '../services/db.js';
import { applyTheme } from '../services/theme.js';
import { kg, compact, parseNum } from '../utils/num.js';
import { dayLabel } from '../utils/date.js';

export function render() {
  const template = activeTemplate();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'More', heading: 'Tools and preferences', back: () => go('/') }),
      el(
        'main',
        { class: 'screen' },
        el(
          'header',
          { class: 'mb-6 max-w-2xl' },
          el('h2', { class: 'text-2xl font-black tracking-tight lg:hidden' }, 'Tools and preferences'),
          el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2 lg:mt-0' }, 'Adjust your training, review your data, and manage the app. Estimates can provide context, but they are not medical advice.'),
        ),
        el(
          'div',
          { class: 'grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-start' },
          toolSection({
            title: 'Training',
            body: 'Shape your plan and review previous sessions.',
            items: [
              { title: 'Training plan', sub: `${template.name} · ${template.days} days per week`, iconName: 'calendar', onClick: openProgram },
              { title: 'Workout history', sub: state.sets.length ? `${state.sets.length} logged sets` : 'Your first logged set will appear here', iconName: 'trophy', onClick: openHistory },
            ],
          }),
          toolSection({
            title: 'Profile and estimates',
            body: 'Personal details stay out of your training flow and on this device.',
            items: [
              { title: 'Personal profile', sub: personalProfileSummary(), iconName: 'scale', onClick: openPersonalProfile },
              { title: 'Training and health estimates', sub: 'BMI, energy needs, 1RM, body fat, and plates', iconName: 'calculator', onClick: openCalculators },
            ],
          }),
          toolSection({
            title: 'App and privacy',
            body: 'Personalize GymLog and stay in control of your data.',
            className: 'lg:col-span-2',
            items: [
              { title: 'Settings', sub: 'Theme, sound, vibration, and rest', iconName: 'info', onClick: openSettings },
              { title: 'Your data', sub: 'Export a copy and review storage use', iconName: 'share', onClick: openData },
            ],
          }),
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

function toolSection({ title, body, items, className = '' }) {
  return el(
    'section',
    { class: `card p-3 lg:p-4 ${className}` },
    el('div', { class: 'px-2 pt-1 pb-3' }, el('h3', { class: 'font-extrabold' }, title), el('p', { class: 'mt-1 text-xs leading-relaxed text-ink-3' }, body)),
    el(
      'div',
      { class: ['grid grid-cols-1 gap-1', className && 'lg:grid-cols-2'] },
      items.map((item) =>
        el(
          'button',
          { type: 'button', class: 'w-full min-h-[68px] flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2 active:scale-[.99]', onClick: item.onClick },
          el('span', { class: 'w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-surface-2 text-accent' }, icon(item.iconName, 'w-5 h-5')),
          el('span', { class: 'flex-1 min-w-0' }, el('span', { class: 'block font-bold' }, item.title), el('span', { class: 'block mt-0.5 text-xs leading-snug text-ink-3' }, item.sub)),
          icon('next', 'w-5 h-5 text-ink-3'),
        ),
      ),
    ),
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
    title: 'Calculators and estimates',
    body: el(
      'div',
      { class: 'flex flex-col gap-3' },
      el('p', { class: 'text-sm leading-relaxed text-ink-2' }, 'Choose a tool based on the question you want to answer. These are estimates for practical context, not diagnoses.'),
      [
        ['Estimated one-rep max', 'Estimate maximal strength from a set you have already performed.', oneRmCalc],
        ['Body mass index (BMI)', 'A broad adult screening ratio based on weight and height.', bmiCalc],
        ['Energy and macronutrients', 'Estimate maintenance calories and a starting macro split.', tdeeCalc],
        ['Estimated body fat', 'US Navy method based on body circumference measurements.', bodyFatCalc],
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

function bmiCalc() {
  const profile = prefs.get('profile') || {};
  calcSheet(
    'Body mass index',
    [
      { key: 'weight', label: 'Your weight (kg)', value: state.body[0]?.weight || profile.weight },
      { key: 'height', label: 'Your height (cm)', step: '1', value: profile.height },
    ],
    ({ weight, height }) => {
      const r = calc.bmi(weight, height);
      if (!r) return el('p', { class: 'text-sm text-ink-3' }, 'Enter weight and height to see an estimate.');

      const metres = height / 100;
      const lower = Math.round(18.5 * metres * metres * 10) / 10;
      const upper = Math.round(24.9 * metres * metres * 10) / 10;
      const interpretation =
        r.band === 'underweight'
          ? 'This is below the reference range. If your weight has changed unintentionally or you have concerns about nutrition or health, speak with a doctor or registered dietitian.'
          : r.band === 'healthy range'
            ? 'This sits within the statistical reference range. It does not describe body composition, fitness, or diet quality.'
            : r.band === 'overweight'
              ? 'This is above the reference range. Consider waist measurement, long-term trend, and muscle mass before drawing conclusions.'
              : 'This range may be associated with higher health risk. Discuss it with a qualified professional rather than relying on BMI alone.';

      return [
        el('p', { class: 'label' }, 'Result'),
        el('div', { class: 'mt-1 flex items-end gap-2' }, el('span', { class: 'text-4xl font-black text-accent num' }, String(r.value)), el('span', { class: 'pb-1 text-sm font-bold capitalize text-ink-2' }, r.band)),
        el(
          'div',
          { class: 'mt-4 grid grid-cols-4 gap-1', 'aria-label': 'BMI ranges' },
          [['< 18.5', 'Below'], ['18.5–24.9', 'Reference'], ['25–29.9', 'Above'], ['≥ 30', 'Higher']].map(([value, label], index) => {
            const active = ['underweight', 'healthy range', 'overweight', 'obesity range'][index] === r.band;
            return el('div', { class: ['rounded-lg p-2 text-center', active ? 'bg-accent text-accent-ink' : 'bg-surface-3 text-ink-3'] }, el('span', { class: 'block text-[10px] font-black num' }, value), el('span', { class: 'block mt-0.5 text-[9px] font-bold' }, label));
          }),
        ),
        el('p', { class: 'mt-4 text-sm leading-relaxed text-ink-2' }, interpretation),
        el('div', { class: 'mt-4 h-px bg-line' }),
        line('Reference weight range for your height', `${kg(lower)}–${kg(upper)} kg`),
        el('p', { class: 'mt-3 text-xs leading-relaxed text-ink-3' }, 'BMI is an adult screening tool. It does not distinguish muscle from fat and should not be used alone for children, pregnancy, very muscular athletes, or older adults.'),
      ];
    },
    {
      intro: el(
        'div',
        { class: 'rounded-2xl border border-line bg-surface p-4' },
        el('h3', { class: 'font-extrabold text-ink' }, 'What does BMI measure?'),
        el('p', { class: 'mt-1.5' }, 'BMI compares weight with height. It can provide a broad adult screening reference, but it does not directly measure body fat or determine whether someone is healthy.'),
      ),
    },
  );
}

function tdeeCalc() {
  const profile = prefs.get('profile') || {};
  calcSheet(
    'Energy and macronutrients',
    [
      { key: 'weight', label: 'Weight (kg)', value: state.body[0]?.weight || profile.weight },
      { key: 'height', label: 'Height (cm)', value: profile.height },
      { key: 'age', label: 'Age', step: '1', value: profile.age },
      { key: 'sex', label: 'Sex used by the formula', value: profile.sex, options: [{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }] },
      { key: 'activity', label: 'Activity level', options: calc.ACTIVITY.map((a) => ({ value: a.id, label: `${a.label} — ${a.hint}` })) },
      { key: 'goal', label: 'Goal', options: [
        { value: 'maintenance', label: 'Maintain weight' },
        { value: 'fat-loss', label: 'Lose fat' },
        { value: 'muscle-gain', label: 'Gain muscle' },
      ] },
    ],
    ({ weight, height, age, sex, activity, goal }) => {
      const bmr = calc.bmr({ weight, height, age, sex });
      if (!bmr) return el('p', { class: 'text-sm text-ink-3' }, 'Complete the fields to see an estimate.');
      const tdee = calc.tdee(bmr, activity);
      const m = calc.macros(tdee, weight, goal);
      return [
        line('Basal metabolic rate', `${bmr} kcal`),
        line('Estimated maintenance', `${tdee} kcal`),
        line('Starting target', `${m.calories} kcal`, true),
        el('div', { class: 'h-px bg-line my-2' }),
        line('Protein', `${m.protein} g`),
        line('Fat', `${m.fat} g`),
        line('Carbohydrate', `${m.carbs} g`),
        el('p', { class: 'text-xs text-ink-3 mt-3' }, 'Mifflin–St Jeor estimate with protein set to 1.8 g per kg.'),
      ];
    },
    { intro: 'Treat this as a starting point, not a meal prescription. Follow it for 2–3 weeks, then adjust using average weight, energy, and training performance.' },
  );
}

function bodyFatCalc() {
  const profile = prefs.get('profile') || {};
  calcSheet(
    'Estimated body fat',
    [
      { key: 'sex', label: 'Sex used by the formula', value: profile.sex, options: [{ value: 'm', label: 'Male' }, { value: 'f', label: 'Female' }] },
      { key: 'height', label: 'Height (cm)', value: profile.height },
      { key: 'neck', label: 'Neck circumference (cm)' },
      { key: 'waist', label: 'Waist circumference (cm)' },
      { key: 'hip', label: 'Hip circumference (cm, required for women)' },
    ],
    (v) => {
      const r = calc.bodyFat(v);
      if (r === null) return el('p', { class: 'text-sm text-ink-3' }, 'Enter height, neck, and waist. Hip circumference is also required for women.');
      return [line('Estimated body fat', `${r}%`, true), el('p', { class: 'text-xs text-ink-3 mt-3' }, 'US Navy circumference method.')];
    },
    { intro: 'Measure without pulling the tape tight, using the same locations and conditions each time. The absolute value has a margin of error; the trend is more useful.' },
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

/* ------------------------------------------------------------------ data */

async function openData() {
  const { used, quota } = await usage();

  const payload = () =>
    JSON.stringify(
      { app: 'gymlog', version: 3, at: new Date().toISOString(), profile: prefs.get('profile'), sets: state.sets, body: state.body, goals: state.goals },
      null,
      2,
    );

  sheet({
    title: 'Your data',
    body: el(
      'div',
      { class: 'flex flex-col gap-3' },
      el(
        'div',
        { class: 'tile' },
        el('p', { class: 'text-sm text-ink-2' }, 'Everything stays on this device. No account and no server.'),
        quota
          ? el('p', { class: 'text-xs text-ink-3 mt-2 num' }, `Storage used: ${(used / 1048576).toFixed(1)} MB of ${(quota / 1048576).toFixed(0)} MB`)
          : null,
        el('p', { class: 'text-xs text-ink-3 mt-1' }, `Connection: ${net.online ? 'online' : 'offline'}`),
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'btn-ghost w-full',
          onClick: async () => {
            const blob = new Blob([payload()], { type: 'application/json' });
            await files.save(`gymlog-${new Date().toISOString().slice(0, 10)}.json`, blob);
            toast('Data exported', { variant: 'ok' });
          },
        },
        'Export all data (JSON)',
      ),
      share.supported
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn-ghost w-full',
              onClick: () => share.send({ title: 'GymLog', text: `This week: ${compact(volume(state.sets))} kg of training volume.` }),
            },
            'Share progress',
          )
        : null,
      clipboard.supported
        ? el(
            'button',
            {
              type: 'button',
              class: 'btn-ghost w-full',
              onClick: async () => {
                await clipboard.copy(payload());
                toast('Copied to clipboard', { variant: 'ok' });
              },
            },
            'Copy to clipboard',
          )
        : null,
    ),
  });
}

/* -------------------------------------------------------------- settings */

function openSettings() {
  const p = prefs.get();
  let handle;

  const toggle = (key, label, hint) => {
    const input = el('input', {
      type: 'checkbox',
      class: 'w-6 h-6 accent-current',
      checked: p[key],
      onChange: (e) => prefs.set({ [key]: e.target.checked }),
    });
    return el(
      'label',
      { class: 'flex items-center gap-3 py-3 border-b border-line' },
      el('span', { class: 'flex-1' }, el('span', { class: 'font-bold block' }, label), el('span', { class: 'text-xs text-ink-3' }, hint)),
      input,
    );
  };

  handle = sheet({
    title: 'Settings',
    body: el(
      'div',
      null,
      el(
        'label',
        { class: 'flex flex-col gap-1.5 mb-4' },
        el('span', { class: 'label' }, 'Theme'),
        el(
          'select',
          {
            class: 'field',
            onChange: (e) => {
              prefs.set({ theme: e.target.value });
              applyTheme(e.target.value);
            },
          },
          [
            { v: 'system', l: 'Use system setting' },
            { v: 'dark', l: 'Dark' },
            { v: 'light', l: 'Light' },
          ].map((o) => el('option', { value: o.v, selected: p.theme === o.v }, o.l)),
        ),
      ),
      toggle('sound', 'Sound', 'Play a tone when rest ends'),
      toggle('vibration', 'Vibration', 'Tactile feedback for key actions'),
      toggle('keepAwake', 'Keep screen awake', 'While a workout is open'),
      el(
        'label',
        { class: 'flex flex-col gap-1.5 mt-4' },
        el('span', { class: 'label' }, 'Default rest time'),
        el('input', {
          type: 'number',
          class: 'field',
          value: p.restDefault,
          step: '15',
          onChange: (e) => prefs.set({ restDefault: Number(e.target.value) || 90 }),
        }),
      ),
      el(
        'div',
        { class: 'mt-6 pt-5 border-t border-line' },
        el('h3', { class: 'font-extrabold' }, 'Starting plan'),
        el('p', { class: 'mt-1 text-xs leading-relaxed text-ink-3' }, 'Run the setup again to revisit experience, available days, and exercises. Existing workout history will stay intact.'),
        el(
          'button',
          {
            type: 'button',
            class: 'btn-ghost mt-3 w-full sm:w-auto',
            onClick: () => {
              prefs.set({ onboarded: false });
              handle.close();
              go('/');
            },
          },
          'Run setup again',
        ),
      ),
    ),
  });
}
