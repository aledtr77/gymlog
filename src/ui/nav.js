/**
 * Desktop navigation.
 *
 * Below 1024px this does not exist: the phone keeps its bare one-action
 * screens. Above it, a pointer is the input and vertical space is cheap, so
 * a persistent rail costs nothing and removes a tap from every jump.
 */
import { el } from './el.js';
import { icon } from './icons.js';
import { go, currentPath } from '../core/router.js';
import { on } from '../core/bus.js';

const ITEMS = [
  { path: '/', label: 'Oggi', icon: 'home' },
  { path: '/timer', label: 'Timer', icon: 'timer' },
  { path: '/exercises', label: 'Esercizi', icon: 'dumbbell' },
  { path: '/stats', label: 'Progressi', icon: 'chart' },
  { path: '/more', label: 'Altro', icon: 'more' },
];

export function mountNav(root) {
  const list = el('nav', { class: 'flex flex-col gap-1 px-3', 'aria-label': 'Navigazione principale' });

  const rail = el(
    'aside',
    { class: 'hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col border-r border-line bg-bg/80 backdrop-blur' },
    el(
      'div',
      { class: 'flex items-center gap-2.5 h-[60px] px-5' },
      el('span', { class: 'w-8 h-8 grid place-items-center rounded-lg bg-accent text-accent-ink font-black' }, 'G'),
      el('span', { class: 'font-extrabold tracking-tight' }, 'GymLog'),
    ),
    list,
  );

  const paint = () => {
    const here = currentPath();
    list.replaceChildren(
      ...ITEMS.map((item) => {
        // "/session/2" still belongs to "Oggi"; only "/" matches exactly.
        const active = item.path === '/' ? here === '/' || here.startsWith('/session') : here.startsWith(item.path);
        return el(
          'button',
          {
            type: 'button',
            class: [
              'relative flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-bold transition',
              active ? 'bg-accent/12 text-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            ],
            'aria-current': active ? 'page' : null,
            onClick: () => go(item.path),
          },
          active
            ? el('span', { class: 'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-accent' })
            : null,
          icon(item.icon, 'w-5 h-5'),
          item.label,
        );
      }),
    );
  };

  paint();
  on('route', paint);
  root.appendChild(rail);
}
