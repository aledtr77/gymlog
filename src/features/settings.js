/** Settings uses master/detail navigation: one category at a time. */
import { el, replace } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, toast } from '../ui/components.js';
import { prefs, reload as reloadState } from '../core/state.js';
import { go } from '../core/router.js';
import { files, clipboard, net } from '../platform/index.js';
import { storageStatus, usage } from '../services/db.js';
import { backupText, deleteAllData, hasDeletableData, restoreBackup } from '../services/backup.js';
import { applyTheme } from '../services/theme.js';

const CATEGORIES = [
  { id: 'appearance', label: 'Appearance', short: 'Theme', icon: 'palette' },
  { id: 'workout', label: 'Workout', short: 'Feedback and rest', icon: 'dumbbell' },
  { id: 'data', label: 'Data & privacy', short: 'Local data and backup', icon: 'shield' },
  { id: 'plan', label: 'Plan setup', short: 'Build the plan again', icon: 'calendar' },
];

let activeCategory = 'appearance';
let dataNotice = null;

export async function render() {
  const current = prefs.get();
  const storage = await usage();
  const storageHealth = storageStatus();
  let active = activeCategory;

  const categoryButtons = new Map();
  const panels = new Map();

  const selectCategory = (id) => {
    active = id;
    activeCategory = id;
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
      el(
        'div',
        { class: 'min-w-0 flex-1' },
        el('strong', null, storageHealth.mode === 'memory' ? 'Temporary storage only' : net.online ? 'Stored locally' : 'Available offline'),
        el('span', null, storageHealth.mode === 'memory'
          ? 'IndexedDB is unavailable. New data will be lost when this page closes.'
          : storage.quota ? `${(storage.used / 1048576).toFixed(1)} MB currently used` : 'IndexedDB is available'),
      ),
      el('span', { class: 'settings-data-summary__state' }, el('i'), storageHealth.mode === 'memory' ? 'Volatile' : 'Private'),
    ),
    settingsGroup(
      settingRow('download', 'Export a backup', 'Download your profile, workouts, measurements, and goals.', actionControl('Export backup', 'download', exportData, true)),
      clipboard.supported
        ? settingRow('copy', 'Copy your data', 'Copy the same complete backup to your clipboard.', actionControl('Copy data', 'copy', copyData))
        : null,
      settingRow('refresh', 'Import and merge', 'Add records from a GymLog backup. Matching IDs are updated.', actionControl('Choose backup', 'refresh', () => importData('merge'))),
      settingRow('database', 'Replace from backup', 'Replace local records and preferences after creating a safety backup.', actionControl('Replace data', 'database', () => importData('replace'))),
    ),
    deleteAllDataControl(),
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
        go('/training');
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

async function exportData() {
  try {
    const text = await backupText();
    const saved = await files.save(`gymlog-${new Date().toISOString().slice(0, 10)}.json`, new Blob([text], { type: 'application/json' }));
    if (saved) toast('Backup exported', { variant: 'ok' });
  } catch (error) {
    toast(`Backup failed: ${error.message}`, { variant: 'err', duration: 5000 });
  }
}

async function copyData() {
  try {
    const copied = await clipboard.copy(await backupText());
    if (copied) toast('Backup copied', { variant: 'ok' });
  } catch (error) {
    toast(`Copy failed: ${error.message}`, { variant: 'err', duration: 5000 });
  }
}

async function eraseEverything(event, onFailure) {
  const button = event.currentTarget;
  button.disabled = true;
  button.replaceChildren('Deleting…');

  try {
    await deleteAllData();
    dataNotice = { tone: 'ok', message: 'All local data has been deleted.' };
    applyTheme('system');
    await reloadState();
  } catch (error) {
    dataNotice = { tone: 'danger', message: `Delete failed: ${error.message}` };
    onFailure();
  }
}

function deleteAllDataControl() {
  const section = el('section', { class: 'mt-5 rounded-2xl border border-danger/35 bg-danger/5 p-5' });

  const paint = (confirming = false) => replace(
    section,
    confirming
      ? el(
          'div',
          { role: 'group', 'aria-label': 'Confirm deletion of all GymLog data' },
          el(
            'div',
            { class: 'flex items-start gap-3' },
            el('span', { class: 'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger', 'aria-hidden': 'true' }, icon('trash', 'w-5 h-5')),
            el(
              'div',
              { class: 'min-w-0' },
              el('h3', { class: 'font-black text-ink' }, 'Delete everything from this device?'),
              el('p', { class: 'mt-1 text-sm leading-relaxed text-ink-2' }, 'Workouts, measurements, weekly marks, goals, training plan, profile, and preferences will be permanently removed. This can only be recovered from an exported backup.'),
            ),
          ),
          el(
            'div',
            { class: 'mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end' },
            el('button', { type: 'button', class: 'btn bg-surface-2 text-ink', onClick: () => paint(false) }, 'Cancel'),
            el('button', { type: 'button', class: 'btn bg-danger text-white', onClick: (event) => eraseEverything(event, () => paint(false)) }, icon('trash', 'w-4 h-4'), 'Delete everything'),
          ),
        )
      : el(
          'div',
          { class: 'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center' },
          el('span', { class: 'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger' }, icon('trash', 'w-5 h-5')),
          el('div', { class: 'min-w-0 flex-1' }, el('strong', { class: 'block text-sm font-extrabold text-danger' }, 'Delete all data'), el('span', { class: 'mt-1 block text-xs leading-relaxed text-ink-3' }, 'Permanently remove workouts, sets, measurements, weekly marks, goals, plan, profile, and preferences from this device.')),
          el('button', {
            type: 'button',
            class: 'settings-action border-danger/40 text-danger',
            onClick: async (event) => {
              const button = event.currentTarget;
              button.disabled = true;
              button.replaceChildren('Checking…');
              try {
                if (!(await hasDeletableData())) {
                  dataNotice = { tone: 'quiet', message: 'Nothing to delete. GymLog is already empty.' };
                  paint(false);
                  return;
                }
                dataNotice = null;
                paint(true);
              } catch (error) {
                dataNotice = { tone: 'danger', message: `Could not check local data: ${error.message}` };
                paint(false);
              }
            },
          }, icon('trash', 'w-4 h-4'), 'Delete all data'),
          dataNotice
            ? el(
                'div',
                { class: 'w-full basis-full border-t border-line pt-3 text-xs text-ink-2', role: 'status', 'aria-live': 'polite' },
                el('span', { class: 'inline-flex items-center gap-2' }, el('i', { class: ['h-1.5 w-1.5 rounded-full', dataNotice.tone === 'ok' ? 'bg-ok' : dataNotice.tone === 'danger' ? 'bg-danger' : 'bg-ink-3'], 'aria-hidden': 'true' }), dataNotice.message),
              )
            : null,
        ),
  );

  paint();
  return section;
}

async function chooseBackupFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'GymLog JSON backup', accept: { 'application/json': ['.json'] } }],
      });
      return handle ? handle.getFile() : null;
    } catch (error) {
      if (error.name === 'AbortError') return null;
      throw error;
    }
  }

  return new Promise((resolve) => {
    const input = el('input', { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

async function importData(mode) {
  try {
    const file = await chooseBackupFile();
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) throw new Error('Backup exceeds the 50 MB safety limit');
    if (mode === 'replace' && !window.confirm('Replace local GymLog data with this backup? A safety backup will be downloaded first.')) return;

    const safety = await backupText();
    const saved = await files.save(
      `gymlog-before-import-${new Date().toISOString().replaceAll(':', '-').slice(0, 19)}.json`,
      new Blob([safety], { type: 'application/json' }),
    );
    if (!saved) return toast('Import cancelled: safety backup was not saved', { variant: 'err' });

    const result = await restoreBackup(await file.text(), { mode });
    await reloadState();
    applyTheme();
    toast(`${result.counts.sets} sets restored`, { variant: 'ok', duration: 4000 });
  } catch (error) {
    toast(`Import failed: ${error.message}`, { variant: 'err', duration: 6000 });
  }
}
