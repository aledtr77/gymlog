/**
 * App behaviour and data management live here, separate from training tools.
 * The page stays explicit: each setting says what it changes before the user
 * touches it.
 */
import { el } from '../ui/el.js';
import { icon } from '../ui/icons.js';
import { appbar, toast } from '../ui/components.js';
import { state, prefs } from '../core/state.js';
import { go } from '../core/router.js';
import { files, clipboard, net } from '../platform/index.js';
import { usage } from '../services/db.js';
import { applyTheme } from '../services/theme.js';

export async function render() {
  const current = prefs.get();
  const storage = await usage();

  return {
    node: el(
      'div',
      null,
      appbar({ title: 'Settings', heading: 'App preferences and data', back: () => go('/more') }),
      el(
        'main',
        { class: 'screen settings-screen lg:max-w-5xl' },
        el(
          'header',
          { class: 'mb-6 max-w-2xl' },
          el('h2', { class: 'text-2xl font-black tracking-tight lg:hidden' }, 'App preferences and data'),
          el('p', { class: 'mt-2 text-sm leading-relaxed text-ink-2 lg:mt-0' }, 'Choose how GymLog behaves and keep control of the information stored on this device.'),
        ),
        el(
          'div',
          { class: 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5 lg:items-start' },
          settingsCard(
            'Appearance',
            'Choose the look that is most comfortable for you.',
            el(
              'label',
              { class: 'flex flex-col gap-2' },
              el('span', { class: 'text-sm font-bold' }, 'Theme'),
              el(
                'select',
                {
                  class: 'field',
                  onChange: (event) => {
                    prefs.set({ theme: event.target.value });
                    applyTheme(event.target.value);
                  },
                },
                [
                  { value: 'system', label: 'Follow this device' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ].map((option) => el('option', { value: option.value, selected: current.theme === option.value }, option.label)),
              ),
            ),
          ),
          settingsCard(
            'During a workout',
            'Set the feedback and rest behaviour used while you train.',
            settingToggle(current, 'sound', 'Rest timer sound', 'Play a tone when the rest period ends.'),
            settingToggle(current, 'vibration', 'Vibration', 'Use tactile feedback for important actions.'),
            settingToggle(current, 'keepAwake', 'Keep screen awake', 'Prevent the screen from sleeping during a workout.'),
            el(
              'label',
              { class: 'mt-4 flex flex-col gap-2' },
              el('span', { class: 'text-sm font-bold' }, 'Default rest time'),
              el('span', { class: 'text-xs leading-relaxed text-ink-3' }, 'Used when an exercise does not specify a different rest period.'),
              el('input', {
                type: 'number',
                inputmode: 'numeric',
                min: '15',
                step: '15',
                class: 'field',
                value: current.restDefault,
                'aria-label': 'Default rest time in seconds',
                onChange: (event) => prefs.set({ restDefault: Math.max(15, Number(event.target.value) || 90) }),
              }),
              el('span', { class: 'text-xs text-ink-3' }, 'Seconds'),
            ),
          ),
          settingsCard(
            'Data and privacy',
            'GymLog works without an account. Your training data stays on this device.',
            el(
              'div',
              { class: 'mb-4 rounded-2xl bg-bg/55 p-3 text-xs leading-relaxed text-ink-2' },
              el('strong', { class: 'block text-sm text-ink' }, net.online ? 'Online' : 'Working offline'),
              storage.quota
                ? `${(storage.used / 1048576).toFixed(1)} MB used on this device.`
                : 'Local storage is available.',
            ),
            settingsAction('Export a backup', 'Download all your GymLog data as a JSON file.', 'share', exportData),
            clipboard.supported
              ? settingsAction('Copy your data', 'Copy the same backup to the clipboard.', 'info', copyData)
              : null,
          ),
          settingsCard(
            'Plan setup',
            'Start the guided setup again if your experience, schedule, or preferred training split has changed.',
            el(
              'div',
              { class: 'rounded-2xl border border-line bg-bg/45 p-4' },
              el('p', { class: 'text-sm font-bold' }, 'Your workout history will not be deleted.'),
              el('p', { class: 'mt-1 text-xs leading-relaxed text-ink-3' }, 'Only the plan used for future workouts will change.'),
              el(
                'button',
                {
                  type: 'button',
                  class: 'btn-ghost mt-4 w-full sm:w-auto',
                  onClick: () => {
                    prefs.set({ onboarded: false });
                    go('/');
                  },
                },
                'Run setup again',
              ),
            ),
          ),
        ),
      ),
    ),
  };
}

function settingsCard(title, body, ...content) {
  return el(
    'section',
    { class: 'card' },
    el('h3', { class: 'text-lg font-black tracking-tight' }, title),
    el('p', { class: 'mt-1 text-sm leading-relaxed text-ink-2' }, body),
    el('div', { class: 'mt-5' }, content),
  );
}

function settingToggle(current, key, title, body) {
  return el(
    'label',
    { class: 'flex items-center gap-4 border-b border-line py-3 first:pt-0 last:border-0' },
    el('span', { class: 'min-w-0 flex-1' }, el('strong', { class: 'block text-sm' }, title), el('span', { class: 'mt-0.5 block text-xs leading-relaxed text-ink-3' }, body)),
    el('input', {
      type: 'checkbox',
      class: 'h-6 w-6 shrink-0 accent-current',
      checked: current[key],
      onChange: (event) => prefs.set({ [key]: event.target.checked }),
    }),
  );
}

function settingsAction(title, body, iconName, onClick) {
  return el(
    'button',
    { type: 'button', class: 'flex min-h-[64px] w-full items-center gap-3 border-t border-line py-3 text-left first:border-0 first:pt-0', onClick },
    el('span', { class: 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent' }, icon(iconName, 'w-5 h-5')),
    el('span', { class: 'min-w-0 flex-1' }, el('strong', { class: 'block text-sm' }, title), el('span', { class: 'mt-0.5 block text-xs leading-relaxed text-ink-3' }, body)),
    icon('next', 'w-5 h-5 text-ink-3'),
  );
}

function dataPayload() {
  return JSON.stringify(
    { app: 'gymlog', version: 3, at: new Date().toISOString(), profile: prefs.get('profile'), sets: state.sets, body: state.body, goals: state.goals },
    null,
    2,
  );
}

async function exportData() {
  const blob = new Blob([dataPayload()], { type: 'application/json' });
  const saved = await files.save(`gymlog-${new Date().toISOString().slice(0, 10)}.json`, blob);
  if (saved) toast('Backup exported', { variant: 'ok' });
}

async function copyData() {
  const copied = await clipboard.copy(dataPayload());
  if (copied) toast('Backup copied', { variant: 'ok' });
}
