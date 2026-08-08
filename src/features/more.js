/** Practical tools presented as one stable master/detail workspace. */
import { el, replace } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, blank, toast } from '../ui/components.js';
import { state, logBody, prefs, setTemplate, activeTemplate } from '../core/state.js';
import { TEMPLATES } from '../data/programs.js';
import { go } from '../core/router.js';
import { volume } from '../core/training.js';
import * as calc from '../utils/calc.js';
import { kg, compact, parseNum } from '../utils/num.js';
import { dayLabel } from '../utils/date.js';

const CATEGORIES = [
  { id: 'plan', label: 'Training plan', short: 'Your weekly structure', icon: 'calendar' },
  { id: 'profile', label: 'Personal profile', short: 'Measurements and estimates', icon: 'scale' },
  { id: 'history', label: 'Workout history', short: 'Completed weights and reps', icon: 'trophy' },
  { id: 'calculators', label: 'Quick calculations', short: 'Strength and plates', icon: 'calculator' },
];

/* The rail carries these on desktop, so they appear here only where there is
   no rail. Without them a phone has no route into Settings or Privacy at all. */
const APP_LINKS = [
  { path: '/settings', label: 'App settings', short: 'Theme, feedback, and data', icon: 'settings' },
  { path: '/privacy', label: 'Privacy', short: 'What happens to your data', icon: 'shield' },
];

const moreView = { active: 'plan', calculator: 'one-rm', planDetail: null };

export function render() {
  const categoryButtons = new Map();
  const panels = new Map();

  const selectCategory = (id) => {
    moreView.active = id;
    for (const [key, button] of categoryButtons) {
      const selected = key === id;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const [key, panel] of panels) panel.hidden = key !== id;
  };

  const categoryNav = el(
    'nav',
    { class: 'settings-nav__items', role: 'tablist', 'aria-label': 'Training tools' },
    CATEGORIES.map((category) => {
      const button = el(
        'button',
        {
          type: 'button',
          class: ['settings-nav__item', category.id === moreView.active && 'is-active'],
          role: 'tab',
          'aria-selected': String(category.id === moreView.active),
          onClick: () => selectCategory(category.id),
        },
        el('span', { class: 'settings-nav__item-icon' }, icon(category.icon, 'w-5 h-5')),
        el('span', { class: 'min-w-0' }, el('strong', null, category.label), el('small', null, category.short)),
        icon('next', 'settings-nav__arrow w-4 h-4'),
      );
      categoryButtons.set(category.id, button);
      return button;
    }),
  );

  const plan = planPanel();
  const profile = profilePanel();
  const history = historyPanel();
  const calculators = calculatorsPanel();
  [plan, profile, history, calculators].forEach((panel) => panels.set(panel.dataset.panel, panel));
  selectCategory(moreView.active);

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'More', heading: 'Useful training tools', back: () => go('/') }),
      el(
        'main',
        { class: 'screen more-screen' },
        el(
          'section',
          { class: 'settings-workspace more-tools' },
          el(
            'aside',
            { class: 'settings-nav' },
            el(
              'header',
              { class: 'settings-nav__head' },
              el('span', { class: 'settings-nav__brand' }, icon('more', 'w-6 h-6')),
              el('div', null, el('p', { class: 'label text-accent' }, 'Tools'), el('h2', null, 'Useful, not complicated')),
            ),
            categoryNav,
            el(
              'div',
              { class: 'more-tools__app lg:hidden' },
              el('p', { class: 'label mb-2 px-1' }, 'App'),
              el(
                'nav',
                { class: 'settings-nav__items', 'aria-label': 'App settings and privacy' },
                APP_LINKS.map((link) => el(
                  'button',
                  { type: 'button', class: 'settings-nav__item', onClick: () => go(link.path) },
                  el('span', { class: 'settings-nav__item-icon' }, icon(link.icon, 'w-5 h-5')),
                  el('span', { class: 'min-w-0' }, el('strong', null, link.label), el('small', null, link.short)),
                )),
              ),
            ),
          ),
          el('div', { class: 'settings-content' }, plan, profile, history, calculators),
        ),
      ),
    ),
  };
}

function panel(id, title, body, iconName, ...content) {
  return el(
    'section',
    { class: 'settings-pane more-pane', dataset: { panel: id }, role: 'tabpanel' },
    el('header', { class: 'settings-pane__head' }, el('span', { class: 'settings-pane__icon' }, icon(iconName, 'w-6 h-6')), el('div', null, el('h2', null, title), el('p', null, body))),
    el('div', { class: 'settings-pane__body more-pane__body' }, content),
  );
}

/* --------------------------------------------------------------- program */

function planPanel() {
  const current = activeTemplate();
  const detailNodes = new Map();
  const detailButtons = new Map();

  const choose = (template) => {
    setTemplate(template.id);
    toast(`Plan selected: ${template.name}`, { variant: 'ok' });
  };

  const showDetails = (id) => {
    moreView.planDetail = moreView.planDetail === id ? null : id;
    for (const [key, detail] of detailNodes) {
      const open = key === moreView.planDetail;
      detail.hidden = !open;
      detailButtons.get(key).setAttribute('aria-expanded', String(open));
      detailButtons.get(key).replaceChildren(icon(open ? 'minus' : 'info', 'w-4 h-4'), open ? 'Hide details' : 'Details');
    }
  };

  const card = (template, selectable = true) => {
    const open = moreView.planDetail === template.id;
    const detailsButton = el('button', { type: 'button', class: 'more-plan__details-button', 'aria-expanded': String(open), onClick: () => showDetails(template.id) }, icon(open ? 'minus' : 'info', 'w-4 h-4'), open ? 'Hide details' : 'Details');
    const details = el(
      'div',
      { class: 'more-plan__details', hidden: !open },
      el('p', { class: 'more-plan__purpose' }, template.bestFor || 'Your plan created during setup.'),
      el(
        'dl',
        { class: 'more-plan__detail-facts' },
        template.duration ? el('div', null, el('dt', null, 'Duration'), el('dd', null, template.duration)) : null,
        template.schedule ? el('div', null, el('dt', null, 'Schedule'), el('dd', null, template.schedule)) : null,
      ),
      el(
        'div',
        { class: 'more-plan__sessions' },
        template.sessions.map((session) => el(
          'section',
          null,
          el('header', null, el('div', null, el('h4', null, session.name), el('p', null, session.focus)), el('span', null, `${session.lifts.length} exercises`)),
          el('ul', null, session.lifts.map((lift) => el('li', null, el('span', null, lift.name), el('small', { class: 'num' }, `${lift.sets} × ${lift.reps}`)))),
        )),
      ),
      !selectable ? el('p', { class: 'more-disclaimer' }, 'Change this custom plan from Plan setup in Settings.') : null,
    );
    detailNodes.set(template.id, details);
    detailButtons.set(template.id, detailsButton);

    return el(
      'article',
      { class: ['more-plan', template.id === current.id && 'is-active'], dataset: { template: template.id } },
      el(
        'div',
        { class: 'more-plan__summary' },
        el('span', { class: 'more-plan__icon' }, icon('calendar', 'w-5 h-5')),
        el('div', { class: 'min-w-0 flex-1' }, el('h3', null, template.name), el('p', null, `${template.days} days per week · ${template.sessions.length} ${template.sessions.length === 1 ? 'workout' : 'workouts'}`)),
        el('span', { class: 'more-plan__active', hidden: template.id !== current.id }, icon('check', 'w-4 h-4'), 'Active'),
      ),
      el(
        'div',
        { class: 'more-plan__actions' },
        detailsButton,
        selectable ? el('button', { type: 'button', class: 'more-plan__choose', hidden: template.id === current.id, onClick: () => choose(template) }, `Use plan`, icon('next', 'w-4 h-4')) : null,
      ),
      details,
    );
  };

  const templates = [
    ...(current.id === 'custom' ? [{ ...current, bestFor: 'Your plan created during setup.' }] : []),
    ...TEMPLATES,
  ];
  const root = el('div', { class: 'more-plan-list' }, templates.map((template) => card(template, template.id !== 'custom')));

  return panel(
    'plan',
    'Training plan',
    'Choose a weekly structure. Open details only when you want to inspect its workouts.',
    'calendar',
    root,
    el('p', { class: 'more-disclaimer' }, 'Pain, medical conditions, movement limitations, and injury recovery require guidance from a qualified professional.'),
  );
}

/* --------------------------------------------------------------- profile */

function profilePanel() {
  const saved = prefs.get('profile') || {};
  const draft = {
    sex: saved.sex || '',
    age: saved.age || '',
    height: saved.height || '',
    weight: state.body[0]?.weight || saved.weight || '',
  };

  const numberField = (key, label, { min, max, step = '1', placeholder }) => {
    const input = el('input', { type: 'number', inputmode: 'decimal', class: 'field', min: String(min), max: String(max), step, value: draft[key], placeholder, onInput: (event) => { draft[key] = event.target.value; } });
    return el('label', { class: 'more-field' }, el('span', { class: 'label' }, label), input);
  };

  const sexButtons = new Map();
  const chooseSex = (value) => {
    draft.sex = value;
    for (const [key, button] of sexButtons) {
      const selected = key === value;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-checked', String(selected));
    }
  };
  const sex = el(
    'div',
    { class: 'more-sex', role: 'radiogroup', 'aria-label': 'Sex used by energy formulas' },
    [['f', 'Female'], ['m', 'Male']].map(([value, label]) => {
      const button = el('button', { type: 'button', class: [draft.sex === value && 'is-active'], role: 'radio', 'aria-checked': String(draft.sex === value), onClick: () => chooseSex(value) }, el('i'), label);
      sexButtons.set(value, button);
      return button;
    }),
  );

  const currentWeight = state.body[0]?.weight || saved.weight;
  const firstWeight = state.body.at(-1)?.weight;
  const change = firstWeight && currentWeight ? Math.round((currentWeight - firstWeight) * 10) / 10 : null;

  return panel(
    'profile',
    'Personal profile',
    'These details improve weight trends and training estimates. Everything remains stored on this device.',
    'scale',
    currentWeight
      ? el('div', { class: 'more-profile-summary' }, metric(`${kg(currentWeight)} kg`, 'Current weight'), metric(change === null ? '—' : `${change > 0 ? '+' : ''}${change} kg`, 'Change since first entry'))
      : null,
    el(
      'section',
      { class: 'more-form' },
      el('div', { class: 'more-form__head' }, el('span', null, icon('scale', 'w-5 h-5')), el('div', null, el('h3', null, 'Your details'), el('p', null, 'Used only where a calculation genuinely needs them.'))),
      el(
        'div',
        { class: 'more-form__grid' },
        el('label', { class: 'more-field' }, el('span', { class: 'label' }, 'Sex used by energy formulas'), sex),
        numberField('age', 'Age', { min: 14, max: 100, placeholder: 'e.g. 30' }),
        numberField('height', 'Height (cm)', { min: 120, max: 230, placeholder: 'e.g. 175' }),
        numberField('weight', 'Current weight (kg)', { min: 30, max: 300, step: '0.1', placeholder: 'e.g. 75' }),
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'btn-primary more-form__save',
          onClick: async () => {
            const profile = normalizeProfile(draft);
            if (!validProfile(profile)) return toast('Complete every field with a valid value', { variant: 'err' });
            const previousWeight = state.body[0]?.weight || saved.weight;
            prefs.set({ profile });
            if (Number(previousWeight) !== profile.weight) await logBody({ weight: profile.weight });
            toast('Personal profile updated', { variant: 'ok' });
          },
        },
        icon('check', 'w-4 h-4'),
        'Save profile',
      ),
    ),
    state.body.length > 1 ? recentWeights() : null,
  );
}

function metric(value, label) {
  return el('span', null, el('strong', { class: 'num' }, value), el('small', null, label));
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

function recentWeights() {
  return el(
    'section',
    { class: 'more-history-block' },
    el('header', null, el('div', null, el('h3', null, 'Recent weight entries'), el('p', null, 'Use similar weighing conditions and focus on the trend.'))),
    el('div', { class: 'more-rows' }, state.body.slice(0, 8).map((entry) => el('div', null, el('span', null, dayLabel(entry.at)), el('strong', { class: 'num' }, `${kg(entry.weight)} kg`)))),
  );
}

/* ----------------------------------------------------------- calculators */

function calculatorsPanel() {
  const host = el('div');
  const buttons = new Map();
  const tools = { 'one-rm': oneRmCalculator(), plates: platesCalculator() };

  const select = (id) => {
    moreView.calculator = id;
    for (const [key, button] of buttons) {
      const active = key === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    replace(host, tools[id]);
  };

  const selector = el(
    'div',
    { class: 'more-calc-tabs' },
    [
      ['one-rm', 'Strength estimate', 'Estimate from a completed set', 'trophy'],
      ['plates', 'Barbell plates', 'Load each side of the bar', 'dumbbell'],
    ].map(([id, title, body, iconName]) => {
      const button = el('button', { type: 'button', class: [id === moreView.calculator && 'is-active'], 'aria-pressed': String(id === moreView.calculator), onClick: () => select(id) }, el('span', null, icon(iconName, 'w-5 h-5')), el('span', null, el('strong', null, title), el('small', null, body)));
      buttons.set(id, button);
      return button;
    }),
  );
  select(moreView.calculator);

  return panel('calculators', 'Quick calculations', 'Two focused tools for questions that come up while training. Results update as you type.', 'calculator', selector, host);
}

function liveCalculator(title, intro, fields, compute) {
  const out = el('div', { class: 'more-calc__result' });
  const inputs = {};
  const run = () => {
    const values = Object.fromEntries(Object.entries(inputs).map(([key, node]) => [key, node.type === 'number' ? parseNum(node.value) : node.value]));
    replace(out, ...[compute(values)].flat().filter(Boolean));
  };
  const form = el(
    'div',
    { class: 'more-calc__fields' },
    fields.map((field) => {
      const input = el('input', { type: 'number', inputmode: 'decimal', step: field.step || '0.1', class: 'field', placeholder: field.label, value: field.value ?? '', onInput: run });
      inputs[field.key] = input;
      return el('label', { class: 'more-field' }, el('span', { class: 'label' }, field.label), input);
    }),
  );
  run();
  return el('section', { class: 'more-calc' }, el('header', null, el('h3', null, title), el('p', null, intro)), el('div', { class: 'more-calc__body' }, form, out));
}

function oneRmCalculator() {
  return liveCalculator(
    'Estimated one-rep max',
    'Use a challenging set completed with clean technique, ideally between 2 and 10 repetitions.',
    [{ key: 'weight', label: 'Weight lifted (kg)' }, { key: 'reps', label: 'Completed reps', step: '1' }],
    ({ weight, reps }) => {
      const oneRm = calc.oneRepMax(weight, reps);
      if (!oneRm) return el('p', { class: 'more-calc__empty' }, 'Enter the weight and completed repetitions.');
      return [
        el('div', { class: 'more-calc__hero' }, el('span', null, 'Estimated maximum'), el('strong', { class: 'num' }, `${kg(oneRm)} kg`)),
        el('div', { class: 'more-rows' }, calc.loadTable(oneRm).map((row) => el('div', null, el('span', null, `${row.pct}% · about ${row.reps} reps`), el('strong', { class: 'num' }, `${kg(row.weight)} kg`)))),
        el('p', { class: 'more-disclaimer' }, 'Epley formula. This is an estimate, not a maximal test.'),
      ];
    },
  );
}

function platesCalculator() {
  return liveCalculator(
    'Barbell plates',
    'Enter the total weight including the bar. The result shows what to load on each side.',
    [{ key: 'target', label: 'Target total weight (kg)' }, { key: 'bar', label: 'Bar weight (kg)', value: 20 }],
    ({ target, bar }) => {
      if (!target) return el('p', { class: 'more-calc__empty' }, 'Enter the total weight you want on the bar.');
      const result = calc.plates(target, bar ?? 20);
      if (!result.ok) return el('p', { class: 'text-sm text-danger' }, result.error);
      return [
        el('div', { class: 'more-calc__hero' }, el('span', null, 'Loadable total'), el('strong', { class: 'num' }, `${kg(result.achieved)} kg`)),
        el('p', { class: 'label mb-2' }, 'Plates on each side'),
        result.plates.length
          ? el('div', { class: 'more-plate-list' }, result.plates.map((plate) => el('span', null, el('strong', { class: 'num' }, kg(plate.plate)), el('small', null, `kg × ${plate.count}`))))
          : el('p', { class: 'more-calc__empty' }, 'The empty bar is enough.'),
        result.error ? el('p', { class: 'mt-3 text-sm text-warn' }, result.error) : null,
      ];
    },
  );
}

/* --------------------------------------------------------------- history */

function historyPanel() {
  const byDay = new Map();
  for (const set of state.sets) {
    const key = new Date(set.at).toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(set);
  }

  const content = byDay.size
    ? el(
        'div',
        { class: 'more-history' },
        [...byDay.entries()].map(([, sets]) => el(
          'section',
          { class: 'more-history-block' },
          el('header', null, el('div', null, el('h3', null, dayLabel(sets[0].at)), el('p', null, `${sets.length} completed ${sets.length === 1 ? 'set' : 'sets'}`)), el('strong', { class: 'num' }, `${compact(volume(sets))} kg`)),
          el('div', { class: 'more-rows' }, sets.slice().reverse().map((set) => el('div', null, el('span', null, set.name), el('strong', { class: 'num' }, `${kg(set.weight)} kg × ${set.reps}`)))),
        )),
      )
    : blank({ title: 'No workout history yet', body: 'Completed sets will appear here automatically.' });

  return panel('history', 'Workout history', 'Review completed sets without opening another screen. Newest training days appear first.', 'trophy', content);
}
