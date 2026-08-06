/**
 * Theme. Lives in services/ rather than in a feature because main.js needs
 * it before the first paint, and a feature module should stay lazy.
 */
import * as prefs from './prefs.js';

export function applyTheme(mode = prefs.get('theme')) {
  const dark =
    mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0a0b0e' : '#f5f6f8');
  return dark;
}

export function watchSystemTheme() {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (prefs.get('theme') === 'system') applyTheme();
  });
}
