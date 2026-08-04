/** Set di icone: tracciati a 24×24, coerenti nello spessore. */

import { h } from './dom.js';

/**
 * Un bilanciere leggibile a 23px si ottiene con cinque rettangoli, non con un
 * tracciato unico: le forme restano nette anche a dimensioni piccole.
 */
const SHAPES = {
  dumbbell: [
    { x: 1, y: 9.5, w: 2.2, h: 5, r: 1.1 },
    { x: 4.2, y: 6, w: 3.2, h: 12, r: 1.4 },
    { x: 7.4, y: 10.4, w: 9.2, h: 3.2, r: 1.2 },
    { x: 16.6, y: 6, w: 3.2, h: 12, r: 1.4 },
    { x: 20.8, y: 9.5, w: 2.2, h: 5, r: 1.1 },
  ],
};

const PATHS = {
  list: 'M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z',
  history:
    'M13 3a9 9 0 1 0 8.5 12h-2.2A6.8 6.8 0 1 1 13 5.2c3.5 0 6.4 2.6 6.8 6h-2.6l3.4 4 3.4-4h-2A9 9 0 0 0 13 3Zm-1 4v6l4.6 2.7.8-1.3-3.9-2.3V7H12Z',
  chart: 'M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z',
  trophy:
    'M18 3h3v3a4 4 0 0 1-3.3 3.9A6 6 0 0 1 13 13.9V17h3a1 1 0 0 1 1 1v2H7v-2a1 1 0 0 1 1-1h3v-3.1A6 6 0 0 1 6.3 9.9 4 4 0 0 1 3 6V3h3V2h12v1Zm0 2v3.8A2 2 0 0 0 19 6V5h-1ZM5 5v1a2 2 0 0 0 1 1.8V5H5Z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  check: 'M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 8.2 19 6.8 9.6 16.2Z',
  close: 'm12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 5.3 5.3Z',
  search:
    'M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
  more: 'M12 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z',
  timer:
    'M15 1H9v2h6V1Zm-4 13h2V8h-2v6Zm8.03-6.61 1.42-1.42a11 11 0 0 0-1.41-1.41l-1.42 1.42A9 9 0 1 0 20 13a8.94 8.94 0 0 0-1.97-5.61ZM12 20a7 7 0 1 1 7-7 7 7 0 0 1-7 7Z',
  calculator:
    'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-6 17H9v-2h2v2Zm0-4H9v-2h2v2Zm4 4h-2v-2h2v2Zm0-4h-2v-2h2v2Zm2-6H7V5h10v4Z',
  edit: 'M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z',
  note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm2 16H8v-2h8v2Zm0-4H8v-2h8v2Zm-3-5V3.5L18.5 9H13Z',
  swap: 'M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3ZM21 9l-3.99-4v3H10v2h7.01v3L21 9Z',
  up: 'm7.4 15.4 4.6-4.6 4.6 4.6L18 14l-6-6-6 6 1.4 1.4Z',
  down: 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z',
  play: 'M8 5v14l11-7L8 5Z',
  flag: 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6Z',
  download: 'M5 20h14v-2H5v2ZM19 9h-4V3H9v6H5l7 7 7-7Z',
  upload: 'M5 20h14v-2H5v2ZM5 9h4v6h6V9h4l-7-7-7 7Z',
  settings:
    'm19.14 12.94.02-.94-.02-.94 2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58-.02.94.02.94-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96c.22.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2Z',
  moon: 'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z',
  info: 'M11 7h2v2h-2V7Zm0 4h2v6h-2v-6Zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z',
  clock:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.5-13H11v6l5.2 3.1.8-1.2-4.5-2.7V7Z',
  fire: 'M13.5 1.5S14 4 12 6.5C10 9 8.5 10 8.5 12.5a3.5 3.5 0 0 0 7 0c0-1-.5-2-.5-2s2.5 1.5 2.5 4.5a6.5 6.5 0 0 1-13 0C4.5 9 9 7.5 9 3.5c0 0 3 1 4.5-2Z',
  back: 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z',
  chevron: 'M9.4 6 8 7.4l4.6 4.6L8 16.6 9.4 18l6-6-6-6Z',
};

export function icon(name, extraClass = '') {
  const attrs = {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
    class: extraClass || null,
  };

  if (SHAPES[name]) {
    return h(
      'svg',
      attrs,
      ...SHAPES[name].map((rect) =>
        h('rect', {
          x: rect.x,
          y: rect.y,
          width: rect.w,
          height: rect.h,
          rx: rect.r,
          fill: 'currentColor',
        }),
      ),
    );
  }

  const d = PATHS[name];
  if (!d) return h('span');
  return h('svg', attrs, h('path', { d, fill: 'currentColor' }));
}
