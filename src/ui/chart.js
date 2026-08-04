/**
 * Grafici.
 *
 * Serie singola, quindi nessuna legenda: il titolo della card dice già cosa
 * si sta guardando. Il tratto usa il colore d'accento, mentre etichette e
 * valori restano sui token di testo — il colore identifica il segno, non
 * scrive parole. Griglia e assi sono volutamente poco contrastati.
 */

import { h } from './dom.js';

const W = 340;
const H = 170;
const PAD = { top: 14, right: 12, bottom: 22, left: 36 };

/** Arrotonda gli estremi dell'asse a un passo leggibile. */
function niceBounds(lo, hi) {
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.1);
  const step = Math.max(0.5, 10 ** Math.floor(Math.log10(span)) / 2);
  return {
    min: Math.floor((lo - span * 0.1) / step) * step,
    max: Math.ceil((hi + span * 0.1) / step) * step,
  };
}

/**
 * Grafico a linea con crosshair e tooltip.
 * @param {{x: number|Date, y: number, label?: string}[]} points
 * @param {{formatY?: Function, formatX?: Function, unit?: string, caption?: string}} options
 */
export function lineChart(points, options = {}) {
  const {
    formatY = (v) => String(Math.round(v)),
    formatX = (v) => String(v),
    unit = '',
    caption = 'Andamento',
  } = options;

  if (points.length < 2) {
    return h(
      'p',
      { class: 'tiny', style: { padding: '24px 0', textAlign: 'center' } },
      'Servono almeno due sessioni per disegnare un andamento.',
    );
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const ys = points.map((p) => p.y);
  const rawMin = Math.min(...ys);
  const rawMax = Math.max(...ys);
  // Estremi "tondi": un asse che dice 115–130 si legge, uno che dice
  // 116,7–129,4 costringe a decifrarlo. Il margine evita anche che il picco
  // tocchi il bordo o che una serie piatta collassi su una riga sola.
  const { min, max } = niceBounds(rawMin, rawMax);

  const px = (i) => PAD.left + (innerW * i) / (points.length - 1);
  const py = (v) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(p.y)}`).join(' ');
  const areaPath = `${linePath} L${px(points.length - 1)},${PAD.top + innerH} L${px(0)},${PAD.top + innerH} Z`;

  const gridLines = [0, 0.5, 1].map((t) => {
    const y = PAD.top + innerH * t;
    return h('line', {
      class: 'chart__grid',
      x1: PAD.left,
      y1: y,
      x2: W - PAD.right,
      y2: y,
    });
  });

  const axisLabels = [
    { value: max, t: 0 },
    { value: min, t: 1 },
  ].map(({ value, t }) =>
    h(
      'text',
      {
        class: 'chart__lbl',
        x: PAD.left - 6,
        y: PAD.top + innerH * t + 3.5,
        'text-anchor': 'end',
      },
      formatY(value),
    ),
  );

  // Etichette selettive: primo, ultimo e massimo. Un numero su ogni punto
  // renderebbe illeggibile il tracciato.
  const maxIndex = ys.indexOf(rawMax);
  const highlight = new Set([0, points.length - 1, maxIndex]);

  const dots = points.map((p, i) =>
    h('circle', {
      class: 'chart__dot',
      cx: px(i),
      cy: py(p.y),
      r: highlight.has(i) ? 4 : 2.5,
    }),
  );

  const valueLabels = [...highlight]
    .sort((a, b) => a - b)
    .map((i) =>
      h(
        'text',
        {
          class: 'chart__lbl',
          x: Math.min(W - PAD.right, Math.max(PAD.left, px(i))),
          y: Math.max(9, py(points[i].y) - 9),
          'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle',
          style: 'font-weight:800',
        },
        formatY(points[i].y),
      ),
    );

  const xLabels = [0, points.length - 1].map((i) =>
    h(
      'text',
      {
        class: 'chart__lbl',
        x: px(i),
        y: H - 4,
        'text-anchor': i === 0 ? 'start' : 'end',
      },
      formatX(points[i].x),
    ),
  );

  const crosshair = h('line', {
    class: 'chart__grid',
    y1: PAD.top,
    y2: PAD.top + innerH,
    style: 'opacity:0',
    stroke: 'currentColor',
  });

  const cursor = h('circle', {
    class: 'chart__dot',
    r: 5.5,
    style: 'opacity:0',
  });

  const svg = h(
    'svg',
    {
      class: 'chart',
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': `${caption}: da ${formatY(points[0].y)}${unit} a ${formatY(points.at(-1).y)}${unit}, massimo ${formatY(rawMax)}${unit}`,
    },
    ...gridLines,
    h('path', { class: 'chart__area', d: areaPath }),
    h('path', { class: 'chart__line', d: linePath }),
    crosshair,
    ...dots,
    ...valueLabels,
    ...axisLabels,
    ...xLabels,
    cursor,
  );

  const tooltip = h('div', {
    class: 'chart-tip',
    style: { opacity: '0' },
    'aria-hidden': 'true',
  });

  const wrapper = h('div', { class: 'chart-wrap' }, svg, tooltip, srTable());

  // Hover e tocco condividono lo stesso percorso: su mobile il "passaggio
  // del dito" è l'unico modo per leggere un punto preciso.
  const onMove = (event) => {
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(
      Math.min(1, Math.max(0, (ratio * W - PAD.left) / innerW)) * (points.length - 1),
    );
    const point = points[index];
    if (!point) return;

    crosshair.setAttribute('x1', px(index));
    crosshair.setAttribute('x2', px(index));
    crosshair.style.opacity = '0.9';
    cursor.setAttribute('cx', px(index));
    cursor.setAttribute('cy', py(point.y));
    cursor.style.opacity = '1';

    tooltip.textContent = `${point.label || formatX(point.x)} · ${formatY(point.y)}${unit}`;
    tooltip.style.opacity = '1';
    tooltip.style.left = `${(px(index) / W) * 100}%`;
  };

  const onLeave = () => {
    crosshair.style.opacity = '0';
    cursor.style.opacity = '0';
    tooltip.style.opacity = '0';
  };

  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerdown', onMove);
  svg.addEventListener('pointerleave', onLeave);
  svg.addEventListener('pointercancel', onLeave);

  function srTable() {
    return h(
      'table',
      { class: 'sr-only' },
      h('caption', null, caption),
      h('tbody', null, ...points.map((p) =>
        h('tr', null, h('th', { scope: 'row' }, formatX(p.x)), h('td', null, `${formatY(p.y)}${unit}`)),
      )),
    );
  }

  return wrapper;
}

/**
 * Colonne. Le barre partono sempre dalla linea di base e hanno la cima
 * arrotondata di 4px; il distacco fra le colonne è dato da un gap reale,
 * non da una barra più stretta.
 */
export function barChart(bars, options = {}) {
  const { formatValue = (v) => String(Math.round(v)), unit = '', caption = 'Volume' } = options;
  const max = Math.max(...bars.map((b) => b.value), 1);

  const node = h(
    'div',
    { class: 'bars', role: 'img', 'aria-label': `${caption}: ${bars.map((b) => `${b.label} ${formatValue(b.value)}${unit}`).join(', ')}` },
    ...bars.map((bar) => {
      const height = bar.value > 0 ? Math.max(4, (bar.value / max) * 100) : 3;
      const column = h(
        'div',
        { class: 'bars__col', title: `${bar.label}: ${formatValue(bar.value)}${unit}` },
        h('div', {
          class: ['bars__bar', bar.value === 0 && 'is-empty'],
          style: { height: `${height}%` },
        }),
        h('span', { class: 'bars__lbl' }, bar.label),
      );
      return column;
    }),
  );

  return node;
}
