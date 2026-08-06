/**
 * Theming.
 * Besides the class on the root element, the theme-color meta must be
 * updated too, or the system status bar keeps the wrong colour once the
 * app is installed.
 */

const DARK_BG = '#0a0b0e';
const LIGHT_BG = '#f6f7f9';

export function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'dark' || theme === 'light') {
    root.setAttribute('data-theme', theme);
  } else {
    root.removeAttribute('data-theme');
  }

  syncStatusBar(theme);
}

function syncStatusBar(theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme !== 'light' && prefersDark);
  const color = dark ? DARK_BG : LIGHT_BG;

  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', color));
}

export function watchSystemTheme(getTheme) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => syncStatusBar(getTheme()));
}
