/**
 * The two-column workspace behind More and Settings: a rail of categories on
 * one side, one visible panel on the other.
 *
 * It exists as a shared piece because on a phone the two screens become one.
 * There is no room for a seventh tab in the bottom bar, so Settings absorbs
 * the training tools below `lg` and the groups keep them apart by name.
 *
 * An item is either a panel (a tab, switched in place) or a link (`path`,
 * which leaves for another route). Mixing them is what lets Privacy sit in
 * the same rail without pretending to be a tab.
 */
import { el } from './el.js';
import { icon } from './icons.js';

export function masterDetail({ brand, kicker, title, groups, view, extra = null, className = '' }) {
  const buttons = new Map();
  const panes = new Map();
  const tabs = groups.flatMap((group) => group.items).filter((item) => !item.path);

  if (!tabs.some((item) => item.id === view.active)) view.active = tabs[0]?.id;

  const select = (id) => {
    view.active = id;
    for (const [key, button] of buttons) {
      const selected = key === id;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const [key, pane] of panes) pane.hidden = key !== id;
  };

  const itemButton = (item) => {
    const selected = !item.path && item.id === view.active;
    const button = el(
      'button',
      {
        type: 'button',
        class: ['settings-nav__item', selected && 'is-active'],
        role: item.path ? null : 'tab',
        'aria-selected': item.path ? null : String(selected),
        onClick: item.path ? item.onClick : () => select(item.id),
      },
      el('span', { class: 'settings-nav__item-icon' }, icon(item.icon, 'w-5 h-5')),
      el('span', { class: 'min-w-0' }, el('strong', null, item.label), el('small', null, item.short)),
      icon('next', 'settings-nav__arrow w-4 h-4'),
    );
    if (!item.path) buttons.set(item.id, button);
    return button;
  };

  /* A single group carries no heading: labelling one list "Tools" only adds a
     word. Headings appear when there is something to tell apart. */
  const labelled = groups.length > 1;
  const blocks = groups.map((group, index) => {
    const list = el(
      'nav',
      { class: 'settings-nav__items', role: 'tablist', 'aria-label': group.label },
      group.items.map(itemButton),
    );
    return labelled
      ? el(
          'div',
          { class: index ? 'settings-nav__group' : null },
          el('p', { class: 'label mb-2 px-1' }, group.label),
          list,
        )
      : list;
  });

  for (const item of tabs) panes.set(item.id, item.panel);
  select(view.active);

  return el(
    'section',
    { class: ['settings-workspace', className] },
    el(
      'aside',
      { class: 'settings-nav' },
      el(
        'header',
        { class: 'settings-nav__head' },
        el('span', { class: 'settings-nav__brand' }, icon(brand, 'w-6 h-6')),
        el('div', null, el('p', { class: 'label text-accent' }, kicker), el('h2', null, title)),
      ),
      blocks,
      extra,
    ),
    el('div', { class: 'settings-content' }, tabs.map((item) => item.panel)),
  );
}
