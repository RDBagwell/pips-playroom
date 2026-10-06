// Number Quest's picture on the playroom card: a number line with a cloud
// covering the numbers Pip has ruled out, and a question mark.
import { svg } from '../../core/svg.js';

const text = (attrs, s) => svg('text', attrs, document.createTextNode(s));

export function numberQuestIcon() {
  return svg('svg', { viewBox: '0 0 160 120', class: 'game-icon', 'aria-hidden': 'true', focusable: 'false' },
    svg('ellipse', { cx: 80, cy: 108, rx: 62, ry: 9, fill: '#000', opacity: 0.08 }),
    svg('rect', { x: 12, y: 70, width: 136, height: 12, rx: 6, fill: '#5CC689' }),
    ...[0, 1, 2, 3, 4].map((i) => svg('rect', { x: 22 + i * 29, y: 62, width: 5, height: 28, rx: 2.5, fill: '#2D2440', opacity: 0.75 })),
    ...['1', '2', '3', '4', '5'].map((d, i) => text({ x: 24.5 + i * 29, y: 104, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: '#2D2440', 'font-family': 'Andika, sans-serif' }, d)),
    // a friendly cloud over the left end
    svg('g', { opacity: 0.96 },
      svg('ellipse', { cx: 34, cy: 72, rx: 24, ry: 16, fill: '#fff' }),
      svg('ellipse', { cx: 52, cy: 66, rx: 18, ry: 15, fill: '#fff' }),
      svg('ellipse', { cx: 20, cy: 78, rx: 14, ry: 10, fill: '#fff' })),
    // Pip's thought bubble
    svg('circle', { cx: 112, cy: 34, r: 26, fill: '#FFC93C' }),
    svg('circle', { cx: 90, cy: 58, r: 5, fill: '#FFC93C' }),
    text({ x: 112, y: 45, 'text-anchor': 'middle', 'font-size': 32, 'font-weight': 700, fill: '#2D2440', 'font-family': 'Andika, sans-serif' }, '?'));
}
