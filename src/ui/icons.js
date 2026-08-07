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
  settings: 'M19.4 13a7.8 7.8 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a8.3 8.3 0 0 0-1.7-1L15 3.3h-4L10.6 6a8.3 8.3 0 0 0-1.7 1L6.5 6l-2 3.4L6.6 11a7.8 7.8 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a8.3 8.3 0 0 0 1.7 1l.4 2.7h4l.4-2.7a8.3 8.3 0 0 0 1.7-1l2.5 1 2-3.4L19.4 13ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
  palette: 'M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a1.5 1.5 0 0 1 0-3h2.5A6.5 6.5 0 0 0 21 6.5C21 4.6 17 3 12 3ZM7 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  moon: 'M20.7 15.2A8 8 0 0 1 8.8 3.3 9 9 0 1 0 20.7 15.2Z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5h1v3h-2V2h1Zm0 17h1v3h-2v-3h1ZM2 11h3v2H2v-2Zm17 0h3v2h-3v-2ZM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1Zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4-2.1-2.1ZM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1-1.4-1.4ZM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1-1.4-1.4Z',
  sound: 'M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-8.7v2.1a7 7 0 0 1 0 13.2v2.1a9 9 0 0 0 0-17.4Z',
  vibration: 'M7 5h10v14H7V5Zm2 2v10h6V7H9ZM3 8h2v8H3V8Zm16 0h2v8h-2V8ZM0 10h2v4H0v-4Zm22 0h2v4h-2v-4Z',
  screen: 'M3 4h18v13H3V4Zm2 2v9h14V6H5Zm4 13h6v2H9v-2Z',
  shield: 'M12 2 4 5v6c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4 2.6 2.6 4.6-4.6L17 10l-6 6Z',
  database: 'M12 2C7 2 3 3.8 3 6v12c0 2.2 4 4 9 4s9-1.8 9-4V6c0-2.2-4-4-9-4Zm0 2c4.3 0 7 1.4 7 2s-2.7 2-7 2-7-1.4-7-2 2.7-2 7-2Zm0 16c-4.3 0-7-1.4-7-2v-2.4c1.7.9 4.2 1.4 7 1.4s5.3-.5 7-1.4V18c0 .6-2.7 2-7 2Zm0-5c-4.3 0-7-1.4-7-2v-2.4c1.7.9 4.2 1.4 7 1.4s5.3-.5 7-1.4V13c0 .6-2.7 2-7 2Z',
  download: 'M11 3h2v10l3.5-3.5 1.4 1.4-5.9 5.9-5.9-5.9 1.4-1.4L11 13V3ZM4 19h16v2H4v-2Z',
  copy: 'M8 8h12v13H8V8Zm2 2v9h8v-9h-8ZM4 3h12v3h-2V5H6v9h1v2H4V3Z',
  refresh: 'M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h8V3l-3.3 3.3Z',
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
  pause: 'M7 5h4v14H7V5Zm6 0h4v14h-4V5Z',
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
