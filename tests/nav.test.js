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
    ['/settings', '/settings'],
  ];

  for (const [route, expected] of routes) {
    assert.equal(primaryNavigationPath(route), expected);
  }
});

test('the phone has no More tab: its routes resolve to Settings', () => {
  assert.equal(primaryNavigationPath('/more'), '/settings');
  assert.equal(primaryNavigationPath('/privacy'), '/settings');
});

test('mobile primary navigation leaves unknown routes without an active item', () => {
  assert.equal(primaryNavigationPath('/unknown'), null);
});
