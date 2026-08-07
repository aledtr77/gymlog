/** Settings uses master/detail navigation: one category at a time. */
import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, toast } from '../ui/components.js';
import { state, prefs } from '../core/state.js';
import { go } from '../core/router.js';
import { files, clipboard, net } from '../platform/index.js';
import { usage } from '../services/db.js';
import { applyTheme } from '../services/theme.js';

const CATEGORIES = [
  { id: 'appearance', label: 'Appearance', short: 'Theme', icon: 'palette' },
  { id: 'workout', label: 'Workout', short: 'Feedback and rest', icon: 'dumbbell' },
  { id: 'data', label: 'Data & privacy', short: 'Local data and backup', icon: 'shield' },
  { id: 'plan', label: 'Plan setup', short: 'Build the plan again', icon: 'calendar' },
];

export async function render() {
  const current = prefs.get();
  const storage = await usage();
  let active = 'appearance';

  const categoryButtons = new Map();
  const panels = new Map();

  const selectCategory = (id) => {
    active = id;
    for (const [key, button] of categoryButtons) {
      const selected = key === active;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const [key, panel] of panels) panel.hidden = key !== active;
  };

  const categoryNav = el(
    'nav',
    { class: 'settings-nav__items', role: 'tablist', 'aria-label': 'Settings categories' },
    CATEGORIES.map((category) => {
      const button = el(
        'button',
        {
          type: 'button',
          class: ['settings-nav__item', category.id === active && 'is-active'],
          role: 'tab',
          'aria-selected': String(category.id === active),
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

  const appearance = settingsPanel(
    'appearance',
    'Appearance',
    'Choose one theme. The change applies immediately across GymLog.',
    'palette',
    el(
      'div',
      { class: 'settings-theme-grid' },
      [
        ['system', 'Use device', 'Follow your system setting', 'screen'],
        ['dark', 'Dark', 'High contrast for dim spaces', 'moon'],
        ['light', 'Light', 'Bright background and dark text', 'sun'],
      ].map(([value, label, body, iconName]) => {
        const button = el(
          'button',
          {
            type: 'button',
            class: ['settings-theme', current.theme === value && 'is-active'],
            'aria-pressed': String(current.theme === value),
            onClick: () => {
              prefs.set({ theme: value });
              applyTheme(value);
              for (const sibling of button.parentElement.children) {
                const selected = sibling === button;
                sibling.classList.toggle('is-active', selected);
                sibling.setAttribute('aria-pressed', String(selected));
              }
            },
          },
          el('span', { class: 'settings-theme__icon' }, icon(iconName, 'w-5 h-5')),
          el('strong', null, label),
          el('small', null, body),
          el('span', { class: 'settings-theme__check' }, icon('check', 'w-4 h-4')),
        );
        return button;
      }),
    ),
  );

  const workout = settingsPanel(
    'workout',
    'Workout experience',
    'Set the feedback you want while training. Every option can be changed later.',
    'dumbbell',
    settingsGroup(
      settingRow('sound', 'Rest timer sound', 'Play a tone when the rest period ends.', settingToggle(current, 'sound', 'Rest timer sound')),
      settingRow('vibration', 'Vibration', 'Confirm important actions with tactile feedback.', settingToggle(current, 'vibration', 'Vibration')),
      settingRow('screen', 'Keep screen awake', 'Prevent the display from sleeping during a workout.', settingToggle(current, 'keepAwake', 'Keep screen awake')),
      settingRow(
        'timer',
        'Default rest time',
        'Used when an exercise does not provide a different rest period.',
        selectControl('Default rest time', String(current.restDefault), restOptions(current.restDefault), (value) => prefs.set({ restDefault: Number(value) })),
      ),
    ),
  );

  const data = settingsPanel(
    'data',
    'Data and privacy',
    'GymLog works without an account. Your information remains on this device unless you export it.',
    'shield',
    el(
      'div',
      { class: 'settings-data-summary' },
      el('span', { class: 'settings-data-summary__icon' }, icon('database', 'w-6 h-6')),
      el('div', { class: 'min-w-0 flex-1' }, el('strong', null, net.online ? 'Stored locally' : 'Available offline'), el('span', null, storage.quota ? `${(storage.used / 1048576).toFixed(1)} MB currently used` : 'Local storage is available')),
      el('span', { class: 'settings-data-summary__state' }, el('i'), 'Private'),
    ),
    settingsGroup(
      settingRow('download', 'Export a backup', 'Download your profile, workouts, measurements, and goals.', actionControl('Export backup', 'download', exportData, true)),
      clipboard.supported
        ? settingRow('copy', 'Copy your data', 'Copy the same complete backup to your clipboard.', actionControl('Copy data', 'copy', copyData))
        : null,
    ),
  );

  const plan = settingsPanel(
    'plan',
    'Plan setup',
    'Run the guided questions again when your schedule, experience, or preferred split changes.',
    'calendar',
    el(
      'div',
      { class: 'settings-plan-callout' },
      el('span', { class: 'settings-plan-callout__icon' }, icon('refresh', 'w-6 h-6')),
      el('div', null, el('strong', null, 'Your workout history is safe'), el('p', null, 'Running setup again only changes the plan used for future workouts. Completed sets and progress remain untouched.')),
      actionControl('Run setup again', 'refresh', () => {
        prefs.set({ onboarded: false });
        go('/');
      }, true),
    ),
  );

  [appearance, workout, data, plan].forEach((panel) => panels.set(panel.dataset.panel, panel));
  selectCategory(active);

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Settings', heading: 'Personalize how GymLog works', back: () => go('/more') }),
      el(
        'main',
        { class: 'screen settings-screen' },
        el(
          'section',
          { class: 'settings-workspace' },
          el(
            'aside',
            { class: 'settings-nav' },
            el(
              'header',
              { class: 'settings-nav__head' },
              el('span', { class: 'settings-nav__brand' }, icon('settings', 'w-6 h-6')),
              el('div', null, el('p', { class: 'label text-accent' }, 'Settings'), el('h2', null, 'Your preferences')),
            ),
            categoryNav,
            el(
              'div',
              { class: 'settings-nav__status' },
              el('span', { class: 'h-2 w-2 rounded-full bg-ok shadow-[0_0_12px_rgb(var(--ok)/.55)]' }),
              el('span', null, el('strong', null, net.online ? 'Stored on this device' : 'Ready offline'), el('small', null, 'No account required')),
            ),
          ),
          el('div', { class: 'settings-content' }, appearance, workout, data, plan),
        ),
      ),
    ),
  };
}

function settingsPanel(id, title, body, iconName, ...content) {
  return el(
    'section',
    { class: 'settings-pane', dataset: { panel: id }, role: 'tabpanel' },
    el(
      'header',
      { class: 'settings-pane__head' },
      el('span', { class: 'settings-pane__icon' }, icon(iconName, 'w-6 h-6')),
      el('div', null, el('h2', null, title), el('p', null, body)),
    ),
    el('div', { class: 'settings-pane__body' }, content),
  );
}

function settingsGroup(...rows) {
  return el('div', { class: 'settings-group' }, rows);
}

function settingRow(iconName, title, body, control) {
  return el(
    'div',
    { class: 'settings-row' },
    el('span', { class: 'settings-row__icon' }, icon(iconName, 'w-[18px] h-[18px]')),
    el('div', { class: 'min-w-0 flex-1' }, el('strong', { class: 'block text-sm font-extrabold' }, title), el('span', { class: 'mt-0.5 block text-xs leading-relaxed text-ink-3' }, body)),
    el('div', { class: 'settings-row__control' }, control),
  );
}

function settingToggle(current, key, label) {
  return el(
    'label',
    { class: 'settings-toggle' },
    el('input', { type: 'checkbox', class: 'sr-only', checked: current[key], 'aria-label': label, onChange: (event) => prefs.set({ [key]: event.target.checked }) }),
    el('span', { class: 'settings-toggle__track', 'aria-hidden': 'true' }, el('span', { class: 'settings-toggle__thumb' })),
  );
}

function selectControl(label, value, options, onChange) {
  return el(
    'select',
    { class: 'settings-select', 'aria-label': label, onChange: (event) => onChange(event.target.value) },
    options.map(([optionValue, optionLabel]) => el('option', { value: optionValue, selected: optionValue === value }, optionLabel)),
  );
}

function restOptions(current) {
  const seconds = [60, 90, 120, 150, 180];
  const saved = Number(current);
  if (saved >= 15 && !seconds.includes(saved)) seconds.push(saved);
  return seconds.sort((a, b) => a - b).map((value) => {
    const minutes = Math.floor(value / 60);
    const remainder = value % 60;
    return [String(value), minutes ? `${minutes} min${remainder ? ` ${remainder} sec` : ''}` : `${value} sec`];
  });
}

function actionControl(label, iconName, onClick, accent = false) {
  return el('button', { type: 'button', class: ['settings-action', accent && 'is-accent'], onClick }, icon(iconName, 'w-4 h-4'), label);
}

function dataPayload() {
  return JSON.stringify({ app: 'gymlog', version: 3, at: new Date().toISOString(), profile: prefs.get('profile'), sets: state.sets, body: state.body, goals: state.goals }, null, 2);
}

async function exportData() {
  const saved = await files.save(`gymlog-${new Date().toISOString().slice(0, 10)}.json`, new Blob([dataPayload()], { type: 'application/json' }));
  if (saved) toast('Backup exported', { variant: 'ok' });
}

async function copyData() {
  const copied = await clipboard.copy(dataPayload());
  if (copied) toast('Backup copied', { variant: 'ok' });
}
