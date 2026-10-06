// Type with Pip's picture on the playroom card: three friendly keys.
import { svg } from '../../core/svg.js';

const text = (attrs, s) => svg('text', attrs, document.createTextNode(s));

export function typingIcon() {
  const key = (x, y, letter, fill) => [
    svg('rect', { x, y: y + 6, width: 40, height: 38, rx: 10, fill: '#00000022' }),
    svg('rect', { x, y, width: 40, height: 38, rx: 10, fill }),
    text({ x: x + 20, y: y + 27, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700, fill: '#2D2440', 'font-family': 'Andika, sans-serif' }, letter),
  ];
  return svg('svg', { viewBox: '0 0 160 120', class: 'game-icon', 'aria-hidden': 'true', focusable: 'false' },
    svg('ellipse', { cx: 80, cy: 108, rx: 62, ry: 9, fill: '#000', opacity: 0.08 }),
    svg('rect', { x: 10, y: 40, width: 140, height: 62, rx: 16, fill: '#E9DCF9' }),
    ...key(18, 50, 'c', '#FFF4DE'), ...key(60, 50, 'a', '#FFC93C'), ...key(102, 50, 't', '#FFF4DE'),
    svg('path', { d: 'M80 34 L74 22 H86 Z', fill: '#FF7A6B' }),
    svg('circle', { cx: 80, cy: 14, r: 9, fill: '#FF7A6B' }));
}
