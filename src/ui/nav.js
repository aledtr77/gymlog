/** Responsive navigation: desktop rail and persistent mobile bottom bar. */
import { el } from './el.js';
import { icon } from './icons.js';
import { go, currentPath } from '../core/router.js';
import { on } from '../core/bus.js';

const ITEMS = [
  { path: '/training', label: 'Training', icon: 'calendar' },
  { path: '/', label: 'Today', icon: 'home' },
  { path: '/timer', label: 'Timer', icon: 'timer' },
  { path: '/exercises', label: 'Exercises', icon: 'dumbbell' },
  { path: '/stats', label: 'Progress', icon: 'chart' },
  { path: '/more', label: 'More', icon: 'more' },
];

/* Below the divider: reached deliberately, not during a workout. The mobile
   bar has no room for these, so More links to both. */
const SECONDARY = [
  { path: '/settings', label: 'Settings', icon: 'settings' },
  { path: '/privacy', label: 'Privacy', icon: 'shield' },
];

export function primaryNavigationPath(path) {
  if (path === '/' || path.startsWith('/session')) return '/';
  if (SECONDARY.some(item => path.startsWith(item.path))) return '/more';
  return ITEMS.find(item => item.path !== '/' && path.startsWith(item.path))?.path ?? null;
}

export function mountNav(root) {
  const list = el('nav', { class: 'flex flex-col gap-1.5 px-4', 'aria-label': 'Main navigation' });
  const settingsList = el('nav', { class: 'mt-3 flex flex-col gap-1.5 border-t border-line/70 px-4 pt-3', 'aria-label': 'App and privacy' });
  const mobileList = el('nav', { class: 'mobile-nav lg:hidden', 'aria-label': 'Main navigation' });

  const rail = el(
    'aside',
    { class: 'hidden lg:flex fixed inset-y-0 left-0 z-40 w-[17rem] flex-col border-r border-line bg-surface/75 backdrop-blur-xl' },
    el(
      'div',
      { class: 'flex items-center gap-3 h-[76px] px-5 border-b border-line/70' },
      el('span', { class: 'w-10 h-10 grid place-items-center rounded-xl bg-accent text-accent-ink text-lg font-black shadow-lg shadow-accent/10' }, 'G'),
      el(
        'span',
        { class: 'flex flex-col leading-tight' },
        el('span', { class: 'font-black tracking-tight text-lg' }, 'GymLog'),
        el('span', { class: 'text-[10px] uppercase tracking-[.16em] text-ink-3 font-bold' }, 'Training journal'),
      ),
    ),
    el('p', { class: 'label px-7 pt-7 pb-3' }, 'Workspace'),
    list,
    settingsList,
    el(
      'div',
      { class: 'mt-auto p-4' },
      el(
        'div',
        { class: 'rounded-2xl border border-line bg-bg/55 p-4' },
        el('div', { class: 'flex items-center gap-2 text-sm font-bold' }, el('span', { class: 'w-2 h-2 rounded-full bg-ok' }), 'Ready offline'),
        el('p', { class: 'mt-1.5 text-xs leading-relaxed text-ink-3' }, 'Your training stays available even without a connection.'),
      ),
    ),
  );

  const paint = () => {
    const here = currentPath();
    const mobileActivePath = primaryNavigationPath(here);
    const navButton = (item) => {
        // "/session/2" still belongs to "Today"; only "/" matches exactly.
        const active = item.path === '/' ? here === '/' || here.startsWith('/session') : here.startsWith(item.path);
        return el(
          'button',
          {
            type: 'button',
            class: [
              'relative flex items-center gap-3 min-h-[48px] px-3.5 rounded-xl text-sm font-bold transition',
              active ? 'bg-accent text-accent-ink shadow-lg shadow-accent/10' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            ],
            'aria-current': active ? 'page' : null,
            onClick: () => go(item.path),
          },
          icon(item.icon, 'w-5 h-5'),
          item.label,
        );
    };

    const mobileButton = (item) => {
      const active = item.path === mobileActivePath;
      return el(
        'button',
        {
          type: 'button',
          class: `mobile-nav__item ${active ? 'is-active' : ''}`,
          'aria-current': active ? 'page' : null,
          'aria-label': item.label,
          onClick: () => go(item.path),
        },
        el('span', { class: 'mobile-nav__icon', 'aria-hidden': 'true' }, icon(item.icon, 'h-5 w-5')),
        el('span', { class: 'max-w-full truncate' }, item.label),
      );
    };

    list.replaceChildren(...ITEMS.map(navButton));
    mobileList.replaceChildren(...ITEMS.map(mobileButton));
    settingsList.replaceChildren(...SECONDARY.map(navButton));
  };

  paint();
  on('route', paint);
  root.append(rail, mobileList);
}
