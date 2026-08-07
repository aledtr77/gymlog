import test from 'node:test';
import assert from 'node:assert/strict';
import { primaryNavigationPath } from '../src/ui/nav.js';

test('mobile primary navigation maps nested routes to their section', () => {
  const routes = [
    ['/', '/'],
    ['/session/new', '/'],
    ['/session/abc', '/'],
    ['/training', '/training'],
    ['/timer', '/timer'],
    ['/exercises', '/exercises'],
    ['/exercises/squat', '/exercises'],
    ['/stats', '/stats'],
    ['/more', '/more'],
    ['/settings', '/more'],
  ];

  for (const [route, expected] of routes) {
    assert.equal(primaryNavigationPath(route), expected);
  }
});

test('mobile primary navigation leaves unknown routes without an active item', () => {
  assert.equal(primaryNavigationPath('/unknown'), null);
});
