/**
 * Icons: 24×24 paths on a shared grid, sized by the caller through classes.
 * They carry no intrinsic dimensions on purpose — a bare icon with no class
 * would otherwise stretch to fill its flex parent.
 */
const P = {
  home: 'M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3Z',
  dumbbell: 'M4 9h2v6H4V9Zm3-2h3v10H7V7Zm4 3.5h2V13h-2v-2.5ZM14 7h3v10h-3V7Zm4 2h2v6h-2V9Z',
  timer: 'M15 1H9v2h6V1Zm-4 13h2V8h-2v6Zm8-6.6 1.4-1.4A11 11 0 1 0 12 23a11 11 0 0 0 7-19.6ZM12 21a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z',
  chart: 'M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z',
  more: 'M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  minus: 'M5 11h14v2H5v-2Z',
  check: 'M9.6 16.2 5.4 12l-1.4 1.4 5.6 5.6L20.4 8.2 19 6.8 9.6 16.2Z',
  close: 'm12 10.6 5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3 1.4-1.4 5.3 5.3Z',
  back: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12l4.6-4.6Z',
  next: 'M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6-1.4-1.4Z',
  search: 'M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z',
  star: 'm12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7L12 17.3Z',
  calendar: 'M7 2v2h10V2h2v2h3v18H2V4h3V2h2Zm13 8H4v10h16V10Z',
  trophy: 'M18 3h3v3a4 4 0 0 1-3.3 3.9A6 6 0 0 1 13 13.9V17h3a1 1 0 0 1 1 1v2H7v-2a1 1 0 0 1 1-1h3v-3.1A6 6 0 0 1 6.3 9.9 4 4 0 0 1 3 6V3h3V2h12v1Z',
  scale: 'M12 3a9 9 0 0 0-9 9v9h18v-9a9 9 0 0 0-9-9Zm0 4 2.5 4.5h-5L12 7Z',
  camera: 'M9 2 7.2 4H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.2L15 2H9Zm3 6a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z',
  calculator: 'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-6 17H9v-2h2v2Zm0-4H9v-2h2v2Zm4 4h-2v-2h2v2Zm0-4h-2v-2h2v2Zm2-6H7V5h10v4Z',
  target: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6Zm0 3a3 3 0 1 0 3 3 3 3 0 0 0-3-3Z',
  share: 'M18 16a3 3 0 0 0-2 .8l-7-4a3 3 0 0 0 0-1.6l7-4A3 3 0 1 0 15 5l-7 4a3 3 0 1 0 0 6l7 4A3 3 0 1 0 18 16Z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z',
  play: 'M8 5v14l11-7L8 5Z',
  info: 'M11 7h2v2h-2V7Zm0 4h2v6h-2v-6Zm1-9a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z',
};

export function icon(name, className = 'w-6 h-6') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `${className} shrink-0 fill-current`);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', P[name] || P.info);
  svg.appendChild(path);
  return svg;
}

export const iconNames = Object.keys(P);
