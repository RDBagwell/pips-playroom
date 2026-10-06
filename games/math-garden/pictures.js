// Countable pictures for Math Garden, drawn in SVG (no image files).
// buildPicture(question) returns { node, countables }: `countables` are the
// objects Pip lights up, in order, when it counts along after a wrong tap.

import { el } from '../../core/dom.js';
import { svg } from '../../core/svg.js';

const DRAW = {
  apple: () => [
    svg('path', { d: 'M20 11 C10 6 3 13 4 22 C5 32 13 37 20 34 C27 37 35 32 36 22 C37 13 30 6 20 11 Z', fill: '#FF6B5B' }),
    svg('path', { d: 'M20 11 Q19 5 23 2', fill: 'none', stroke: '#7A4A23', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M22 7 Q29 3 32 8 Q26 11 22 7 Z', fill: '#5CC689' }),
    svg('ellipse', { cx: 13, cy: 18, rx: 3, ry: 5, fill: '#fff', opacity: 0.45 }),
  ],
  shell: () => [
    svg('path', { d: 'M20 5 L36 30 Q20 38 4 30 Z', fill: '#FFB4A2' }),
    svg('path', { d: 'M20 5 L12 33 M20 5 L20 35 M20 5 L28 33', stroke: '#E8846F', 'stroke-width': 2, fill: 'none' }),
    svg('rect', { x: 15, y: 31, width: 10, height: 6, rx: 3, fill: '#E8846F' }),
  ],
  star: () => [
    svg('path', { d: 'M20 3 L25 15 L38 15.5 L28 24 L31.5 37 L20 29.5 L8.5 37 L12 24 L2 15.5 L15 15 Z', fill: '#FFC93C', stroke: '#DEA51C', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
  ],
  flower: () => [
    ...[0, 72, 144, 216, 288].map((r) => svg('ellipse', { cx: 20, cy: 10, rx: 7, ry: 9, fill: '#FF9ED2', transform: `rotate(${r} 20 20)` })),
    svg('circle', { cx: 20, cy: 20, r: 6, fill: '#FFC93C' }),
  ],
  bee: () => [
    svg('ellipse', { cx: 14, cy: 11, rx: 7, ry: 5, fill: '#DFF3FF', opacity: 0.9 }),
    svg('ellipse', { cx: 26, cy: 11, rx: 7, ry: 5, fill: '#DFF3FF', opacity: 0.9 }),
    svg('ellipse', { cx: 20, cy: 23, rx: 14, ry: 11, fill: '#FFC93C' }),
    svg('path', { d: 'M15 13 V33 M23 13 V33', stroke: '#2D2440', 'stroke-width': 4 }),
    svg('circle', { cx: 32, cy: 21, r: 1.8, fill: '#2D2440' }),
  ],
  leaf: () => [
    svg('path', { d: 'M6 34 C4 18 16 5 35 5 C35 24 22 36 6 34 Z', fill: '#5CC689' }),
    svg('path', { d: 'M6 34 L28 12', stroke: '#3E9E68', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  ],
};

export function objectSvg(object = 'apple', extraClass = '') {
  return svg('svg', { viewBox: '0 0 40 40', class: `obj ${extraClass}`.trim(), 'aria-hidden': 'true', focusable: 'false' }, ...(DRAW[object] || DRAW.apple)());
}

/** A group of objects in rows of five, like a ten-frame. */
function group(n, object, extraClass = '') {
  const items = Array.from({ length: n }, () => objectSvg(object, extraClass));
  return { node: el('span', { class: 'obj-group' }, ...items), items };
}

const sign = (text) => el('span', { class: 'pic-sign', 'aria-hidden': 'true', text });

/** A bar of ten small squares, for tens. */
function tenBar() {
  return el('span', { class: 'ten-bar' }, ...Array.from({ length: 10 }, () => el('span', { class: 'ten-cell' })));
}

export function buildPicture(q) {
  const { object } = q;
  let node;
  let countables = [];
  switch (q.skill) {
    case 'count': {
      const g = group(q.a, object);
      node = g.node;
      countables = g.items;
      break;
    }
    case 'add':
    case 'doubles': {
      const left = group(q.a, object);
      const right = group(q.b, object, 'obj-b');
      node = el('span', { class: 'pic-sum' }, left.node, sign('+'), right.node);
      countables = [...left.items, ...right.items];
      break;
    }
    case 'sub': {
      const g = group(q.a, object);
      // The last b objects "go away": faded and crossed, and not counted.
      g.items.slice(q.a - q.b).forEach((o) => o.classList.add('obj-gone'));
      node = g.node;
      countables = g.items.slice(0, q.a - q.b);
      break;
    }
    case 'bonds': {
      const cells = Array.from({ length: q.b }, (_, i) => (i < q.a
        ? el('span', { class: 'frame-cell frame-filled' }, objectSvg(object))
        : el('span', { class: 'frame-cell frame-empty' })));
      node = el('span', { class: 'ten-frame' }, ...cells);
      countables = cells.slice(q.a);
      break;
    }
    case 'tens': {
      node = el('span', { class: 'pic-sum' },
        el('span', { class: 'bars' }, ...Array.from({ length: q.a / 10 }, tenBar)),
        sign('+'),
        el('span', { class: 'bars bars-b' }, ...Array.from({ length: q.b / 10 }, tenBar)));
      countables = [...node.querySelectorAll('.ten-bar')];
      break;
    }
    case 'times': {
      // a rows of b. Small facts use the objects; big ones use dots.
      const small = q.a * q.b <= 20;
      const rows = Array.from({ length: q.a }, () => el('span', { class: 'times-row' },
        ...Array.from({ length: q.b }, () => (small ? objectSvg(object) : el('span', { class: 'times-dot' })))));
      node = el('span', { class: 'times-grid' }, ...rows);
      countables = rows;
      break;
    }
    default:
      node = el('span');
  }
  return { node: el('div', { class: `picture picture-${q.skill}`, 'aria-hidden': 'true' }, node), countables };
}
