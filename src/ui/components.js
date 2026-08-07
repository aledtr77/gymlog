/**
 * Shared UI. Only what appears on three or more screens; anything used once
 * stays in its feature file.
 */
import { el } from './el.js';
import { icon } from './icons.js';
import { haptics } from '../platform/index.js';

/** Header. `back` turns the title into a navigable stack. */
export function appbar({ title, back = null, action = null, sub = null, heading = null }) {
  return el(
    'header',
    { class: ['appbar', heading && 'appbar--contextual'] },
    back
      ? el(
          'button',
          {
            type: 'button',
            class: 'appbar-back w-11 h-11 -ml-2 grid place-items-center rounded-full text-ink-2 active:bg-surface-2',
            'aria-label': 'Back',
            onClick: back,
          },
          icon('back', 'w-6 h-6'),
        )
      : null,
    el(
      'div',
      { class: 'appbar__copy flex-1 min-w-0' },
      el('h1', { class: 'appbar__title text-lg font-extrabold tracking-tight truncate' }, title),
      heading ? el('span', { class: 'appbar__divider', 'aria-hidden': 'true' }) : null,
      heading ? el('p', { class: 'appbar__heading' }, heading) : null,
      sub ? el('p', { class: 'appbar__sub text-xs text-ink-3 truncate' }, sub) : null,
    ),
    action,
  );
}

/** Shared page surface: contextual heading above content, responsive by CSS. */
export function workspace({ iconName, title, body, action = null, content, className = '' }) {
  return el(
    'section',
    { class: `workspace ${className}`.trim() },
    el(
      'header',
      { class: 'workspace__head' },
      iconName ? el('span', { class: 'workspace__icon', 'aria-hidden': 'true' }, icon(iconName, 'w-6 h-6')) : null,
      el('div', { class: 'min-w-0 flex-1' }, el('h2', { class: 'workspace__title' }, title), body ? el('p', { class: 'workspace__copy' }, body) : null),
      action ? el('div', { class: 'workspace__action' }, action) : null,
    ),
    el('div', { class: 'workspace__body' }, content),
  );
}

/** Heading for a distinct group inside a workspace. */
export function groupHeading({ iconName, title, body = null, action = null }) {
  return el(
    'header',
    { class: 'group-heading' },
    iconName ? el('span', { class: 'group-heading__icon', 'aria-hidden': 'true' }, icon(iconName, 'w-5 h-5')) : null,
    el('div', { class: 'min-w-0 flex-1' }, el('h3', null, title), body ? el('p', null, body) : null),
    action,
  );
}

/** Big number with a caption. The dashboard is mostly these. */
export function stat(value, label, { accent = false } = {}) {
  return el(
    'div',
    { class: 'flex flex-col min-w-0' },
    el(
      'span',
      { class: ['text-2xl font-extrabold num truncate', accent ? 'text-accent' : 'text-ink'] },
      value,
    ),
    el('span', { class: 'label mt-0.5' }, label),
  );
}

/** Stepper. Keys, not a keyboard: this is used with chalk on your hands. */
export function stepper({ label, value, step = 1, min = 0, format = String, onChange }) {
  let current = value;
  const display = el('button', {
    type: 'button',
    class: 'flex-1 min-w-0 h-14 text-3xl font-extrabold num truncate',
    'aria-label': `${label}: ${format(current)}. Tap to type`,
  });

  const paint = () => {
    display.textContent = format(current);
    display.setAttribute('aria-label', `${label}: ${format(current)}. Tap to type`);
  };

  const bump = (delta) => {
    current = Math.max(min, Math.round((current + delta) * 100) / 100);
    haptics.tap();
    paint();
    onChange(current);
  };

  display.onclick = () => {
    const typed = window.prompt(label, String(current).replace('.', ','));
    if (typed === null) return;
    const parsed = Number(typed.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= min) {
      current = parsed;
      paint();
      onChange(current);
    }
  };

  paint();

  const key = (glyph, delta, aria) =>
    el(
      'button',
      {
        type: 'button',
        class:
          'w-14 h-14 shrink-0 grid place-items-center rounded-xl bg-surface-2 border border-line text-ink-2 transition active:bg-accent active:text-accent-ink active:scale-95',
        'aria-label': aria,
        onClick: () => bump(delta),
      },
      icon(glyph, 'w-6 h-6'),
    );

  return el(
    'div',
    { class: 'flex items-center gap-3 rounded-2xl bg-surface border border-line p-3' },
    el('span', { class: 'label w-12 shrink-0' }, label),
    el(
      'div',
      { class: 'flex-1 min-w-0 flex items-center gap-2' },
      key('minus', -step, `Diminuisci ${label}`),
      display,
      key('plus', step, `Aumenta ${label}`),
    ),
  );
}

/** Empty state that occupies its space rather than floating in it. */
export function blank({ title, body, action = null }) {
  return el(
    'div',
    {
      class:
        'min-h-[46vh] grid place-content-center gap-2 text-center rounded-xl2 border border-dashed border-line p-6',
    },
    el('p', { class: 'text-lg font-extrabold' }, title),
    el('p', { class: 'text-sm text-ink-3 max-w-xs' }, body),
    action,
  );
}

/* ---------------------------------------------------------------- toasts */
let toastHost = null;

export function toast(message, { variant = 'default', duration = 2600 } = {}) {
  if (!toastHost) {
    toastHost = el('div', {
      class: 'fixed left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none',
      style: { bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' },
      role: 'status',
      'aria-live': 'polite',
    });
    document.body.appendChild(toastHost);
  }

  const tone =
    variant === 'ok' ? 'bg-ok text-black'
      : variant === 'err' ? 'bg-danger text-white'
        : 'bg-surface-3 text-ink';

  const node = el(
    'div',
    {
      class: `mx-auto w-full max-w-lg rounded-2xl px-4 py-3 text-sm font-bold shadow-2xl animate-rise ${tone}`,
    },
    message,
  );

  toastHost.appendChild(node);
  setTimeout(() => node.remove(), duration);
}
