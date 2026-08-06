/**
 * Shared UI. Only what appears on three or more screens; anything used once
 * stays in its feature file.
 */
import { el, replace } from './el.js';
import { icon } from './icons.js';
import { haptics } from '../platform/index.js';

/** Header. `back` turns the title into a navigable stack. */
export function appbar({ title, back = null, action = null, sub = null }) {
  return el(
    'header',
    { class: 'appbar' },
    back
      ? el(
          'button',
          {
            type: 'button',
            class: 'w-11 h-11 -ml-2 grid place-items-center rounded-full text-ink-2 active:bg-surface-2',
            'aria-label': 'Indietro',
            onClick: back,
          },
          icon('back', 'w-6 h-6'),
        )
      : null,
    el(
      'div',
      { class: 'flex-1 min-w-0' },
      el('h1', { class: 'text-lg font-extrabold tracking-tight truncate' }, title),
      sub ? el('p', { class: 'text-xs text-ink-3 truncate' }, sub) : null,
    ),
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

/** Row that navigates. 64px tall so it is a comfortable thumb target. */
export function navRow({ title, sub, iconName, badge = null, onClick }) {
  return el(
    'button',
    {
      type: 'button',
      class:
        'w-full min-h-[64px] flex items-center gap-3 rounded-2xl bg-surface border border-line px-4 py-3 text-left transition active:scale-[0.99] active:border-accent/40',
      onClick,
    },
    iconName
      ? el(
          'span',
          { class: 'w-10 h-10 grid place-items-center rounded-xl bg-surface-2 text-accent shrink-0' },
          icon(iconName, 'w-5 h-5'),
        )
      : null,
    el(
      'span',
      { class: 'flex-1 min-w-0 flex flex-col' },
      el('span', { class: 'font-bold truncate' }, title),
      sub ? el('span', { class: 'text-sm text-ink-3 truncate num' }, sub) : null,
    ),
    badge,
    icon('next', 'w-5 h-5 text-ink-3'),
  );
}

/** Stepper. Keys, not a keyboard: this is used with chalk on your hands. */
export function stepper({ label, value, step = 1, min = 0, format = String, onChange }) {
  let current = value;
  const display = el('button', {
    type: 'button',
    class: 'flex-1 min-w-0 h-14 text-3xl font-extrabold num truncate',
    'aria-label': `${label}: ${format(current)}. Tocca per digitare`,
  });

  const paint = () => {
    display.textContent = format(current);
    display.setAttribute('aria-label', `${label}: ${format(current)}. Tocca per digitare`);
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

/** Full-screen panel. Pushes history so Android back closes it. */
export function sheet({ title, body, onClose }) {
  const layer = el(
    'div',
    { class: 'fixed inset-0 z-50 bg-bg flex flex-col animate-rise', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    appbar({ title, back: close }),
    el('div', { class: 'flex-1 overflow-y-auto' }, el('div', { class: 'screen' }, body)),
  );

  function close() {
    layer.remove();
    window.removeEventListener('popstate', close);
    onClose?.();
  }

  history.pushState({ sheet: true }, '');
  window.addEventListener('popstate', close, { once: true });
  document.body.appendChild(layer);
  return { close, node: layer };
}

export { replace };
