// The Reading Game's picture on the playroom card: an open storybook.
import { svg } from '../../core/svg.js';

const text = (attrs, s) => svg('text', attrs, document.createTextNode(s));

export function readingIcon() {
  return svg('svg', { viewBox: '0 0 160 120', class: 'game-icon', 'aria-hidden': 'true', focusable: 'false' },
    svg('ellipse', { cx: 80, cy: 108, rx: 62, ry: 9, fill: '#000', opacity: 0.08 }),
    svg('path', { d: 'M14 30 Q46 16 80 30 Q114 16 146 30 L146 100 Q114 88 80 102 Q46 88 14 100 Z', fill: '#4DB6F0' }),
    svg('path', { d: 'M22 28 Q50 16 77 30 L77 94 Q50 82 22 92 Z', fill: '#fff' }),
    svg('path', { d: 'M138 28 Q110 16 83 30 L83 94 Q110 82 138 92 Z', fill: '#fff' }),
    text({ x: 49, y: 66, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: '#FF7A6B', 'font-family': 'Andika, sans-serif' }, 'ab'),
    text({ x: 111, y: 66, 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: '#5CC689', 'font-family': 'Andika, sans-serif' }, 'cd'),
    svg('path', { d: 'M34 78 q14 -5 30 0 M96 78 q14 -5 30 0', fill: 'none', stroke: '#BFD9EC', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M126 6 l4 9 10 1 -8 6 3 10 -9 -5 -9 5 3 -10 -8 -6 10 -1 Z', fill: '#FFC93C' }));
}
