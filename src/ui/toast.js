import { h } from './dom.js';
import { icon } from './icons.js';

let host = null;

function container() {
  if (host) return host;
  const layer = document.getElementById('layer-toast');
  host = h('div', { class: 'toasts' });
  layer.append(host);
  return host;
}

/**
 * @param {string} message
 * @param {{variant?: 'default'|'ok'|'pr'|'err', duration?: number,
 *          iconName?: string, action?: {label: string, onClick: Function}}} options
 */
export function toast(message, options = {}) {
  const { variant = 'default', duration = 2800, iconName, action } = options;

  const node = h(
    'div',
    { class: ['toast', variant !== 'default' && `toast--${variant}`] },
    iconName ? icon(iconName) : null,
    h('span', { class: 'grow' }, message),
    action
      ? h(
          'button',
          {
            type: 'button',
            class: 'toast__action',
            onClick: () => {
              dismiss();
              action.onClick();
            },
          },
          action.label,
        )
      : null,
  );

  container().append(node);

  let timer = setTimeout(dismiss, duration);

  function dismiss() {
    clearTimeout(timer);
    if (!node.isConnected) return;
    node.classList.add('is-out');
    node.addEventListener('animationend', () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 400);
  }

  // Tapping the toast dismisses it at once: users always try this, and
  // not responding reads as a bug.
  node.addEventListener('click', (event) => {
    if (!event.target.closest('.toast__action')) dismiss();
  });

  return dismiss;
}
