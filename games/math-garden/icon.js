// Math Garden's picture on the playroom card: a flower bed with "2 + 3".
import { svg } from '../../core/svg.js';
import { objectSvg } from './pictures.js';

const text = (attrs, s) => svg('text', attrs, document.createTextNode(s));

export function mathGardenIcon() {
  const place = (node, x, y, size) => {
    node.setAttribute('x', String(x));
    node.setAttribute('y', String(y));
    node.setAttribute('width', String(size));
    node.setAttribute('height', String(size));
    node.removeAttribute('class');
    return node;
  };
  return svg('svg', { viewBox: '0 0 160 120', class: 'game-icon', 'aria-hidden': 'true', focusable: 'false' },
    svg('ellipse', { cx: 80, cy: 108, rx: 62, ry: 9, fill: '#000', opacity: 0.08 }),
    svg('path', { d: 'M14 96 Q80 70 146 96 L146 104 Q80 112 14 104 Z', fill: '#86C55A' }),
    ...[24, 50, 100, 126].map((x) => svg('path', { d: `M${x + 10} 96 V74`, stroke: '#3E9E68', 'stroke-width': 3 })),
    place(objectSvg('flower'), 20, 58, 24), place(objectSvg('flower'), 46, 54, 24),
    place(objectSvg('flower'), 96, 54, 24), place(objectSvg('flower'), 122, 58, 24),
    place(objectSvg('apple'), 70, 66, 20),
    svg('rect', { x: 34, y: 8, width: 92, height: 38, rx: 14, fill: '#fff', stroke: '#FFC93C', 'stroke-width': 3 }),
    text({ x: 80, y: 36, 'text-anchor': 'middle', 'font-size': 24, 'font-weight': 700, fill: '#2D2440', 'font-family': 'Andika, sans-serif' }, '2 + 3'));
}
