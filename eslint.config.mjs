// Four environments, and keeping them apart is the point.
//
// Everything under src/ is a module the page loads, so it gets the browser
// globals and nothing else — a stray `process` or `require` in there is a bug
// that only surfaces at runtime, in a browser, on someone else's phone.
//
// public/sw.js is not a page module. It runs in the service worker scope,
// where there is no `window` and no `document`, and where `self`, `caches` and
// `clients` are the API. Linting it as browser code hides the mistake that
// matters most there: reaching for a DOM that does not exist.
//
// Tests, build configuration and scripts run in Node and never reach a browser.

import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', '.wrangler/**'] },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: js.configs.recommended.rules,
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: globals.serviceworker,
    },
    rules: js.configs.recommended.rules,
  },
  {
    files: ['tests/**/*.js', 'scripts/**/*.mjs', '*.config.js', '*.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
];
