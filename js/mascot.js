// Pip the owl: the game's original mascot, drawn in SVG.
// States (CSS classes on the wrapper): idle, cheer, nod, dance, hello.

import { svg } from './svg.js';
import { el } from './dom.js';

export const COLORS = {
  body: '#E8954A',
  dark: '#C4733A',
  belly: '#FDE6BF',
  eye: '#FFF9EE',
  pupil: '#2D2440',
  beak: '#FFB627',
  cheek: '#FF8A80',
  book: '#4DB6F0',
};

/** The owl drawing itself, as an <svg> element (also used to make the app icons). */
export function owlSvg({ title = 'Pip the owl' } = {}) {
  const c = COLORS;
  return svg('svg', { viewBox: '0 0 200 220', class: 'owl', role: 'img', 'aria-label': title, focusable: 'false' },
    // ear tufts
    svg('path', { d: 'M50 64 L38 16 Q60 30 84 44 Z', fill: c.dark }),
    svg('path', { d: 'M150 64 L162 16 Q140 30 116 44 Z', fill: c.dark }),
    // wings (behind the body so they peek out and flap)
    svg('g', { class: 'wing wing-left' }, svg('ellipse', { cx: 36, cy: 128, rx: 20, ry: 46, fill: c.dark })),
    svg('g', { class: 'wing wing-right' }, svg('ellipse', { cx: 164, cy: 128, rx: 20, ry: 46, fill: c.dark })),
    // body and tummy
    svg('ellipse', { cx: 100, cy: 118, rx: 72, ry: 84, fill: c.body }),
    svg('ellipse', { cx: 100, cy: 148, rx: 48, ry: 52, fill: c.belly }),
    svg('path', {
      d: 'M78 132 q6 7 12 0 M96 132 q6 7 12 0 M114 132 q6 7 12 0 M86 150 q6 7 12 0 M104 150 q6 7 12 0',
      fill: 'none', stroke: '#EDBE83', 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }),
    // eyes (the lids and happy eyes start hidden; CSS animates them)
    svg('g', { class: 'eyes' },
      svg('circle', { cx: 72, cy: 88, r: 29, fill: c.eye, stroke: c.dark, 'stroke-width': 5 }),
      svg('circle', { cx: 128, cy: 88, r: 29, fill: c.eye, stroke: c.dark, 'stroke-width': 5 }),
      svg('g', { class: 'pupils' },
        svg('circle', { cx: 76, cy: 91, r: 13, fill: c.pupil }),
        svg('circle', { cx: 124, cy: 91, r: 13, fill: c.pupil }),
        svg('circle', { cx: 81, cy: 86, r: 4.5, fill: '#fff' }),
        svg('circle', { cx: 129, cy: 86, r: 4.5, fill: '#fff' })),
      svg('g', { class: 'happy-eyes', opacity: 0 },
        svg('path', { d: 'M58 94 Q72 76 86 94', fill: 'none', stroke: c.pupil, 'stroke-width': 6, 'stroke-linecap': 'round' }),
        svg('path', { d: 'M114 94 Q128 76 142 94', fill: 'none', stroke: c.pupil, 'stroke-width': 6, 'stroke-linecap': 'round' })),
      svg('ellipse', { class: 'lid', cx: 72, cy: 88, rx: 31, ry: 31, fill: c.body, transform: 'scale(1 0)' }),
      svg('ellipse', { class: 'lid', cx: 128, cy: 88, rx: 31, ry: 31, fill: c.body, transform: 'scale(1 0)' })),
    // cheeks and beak
    svg('circle', { cx: 50, cy: 118, r: 9, fill: c.cheek, opacity: 0.55 }),
    svg('circle', { cx: 150, cy: 118, r: 9, fill: c.cheek, opacity: 0.55 }),
    svg('path', { d: 'M100 104 L89 116 Q100 131 111 116 Z', fill: c.beak }),
    // a little open book
    svg('g', { class: 'book' },
      svg('path', { d: 'M58 184 Q80 174 100 184 Q120 174 142 184 L142 210 Q120 202 100 212 Q80 202 58 210 Z', fill: c.book }),
      svg('path', { d: 'M64 182 Q82 174 98 184 L98 206 Q82 198 64 204 Z', fill: '#fff' }),
      svg('path', { d: 'M136 182 Q118 174 102 184 L102 206 Q118 198 136 204 Z', fill: '#fff' }),
      svg('path', { d: 'M72 188 q12 -4 20 2 M72 195 q12 -4 20 2 M108 190 q10 -6 20 -2 M108 197 q10 -6 20 -2', fill: 'none', stroke: '#BFD9EC', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
      // feet holding the book
      svg('ellipse', { cx: 82, cy: 182, rx: 9, ry: 6, fill: c.beak }),
      svg('ellipse', { cx: 118, cy: 182, rx: 9, ry: 6, fill: c.beak })),
  );
}

/**
 * A mascot you can make react. Returns { node, cheer, nod, dance, idle }.
 */
export function createMascot(state = 'idle') {
  const node = el('div', { class: 'mascot', 'data-state': state }, owlSvg());
  let timer = null;

  function set(next, ms) {
    clearTimeout(timer);
    node.dataset.state = 'idle';
    void node.offsetWidth; // restart the CSS animation
    node.dataset.state = next;
    if (ms) timer = setTimeout(() => { node.dataset.state = 'idle'; }, ms);
  }

  return {
    node,
    cheer: () => set('cheer', 1000),
    nod: () => set('nod', 900),
    dance: () => set('dance'),
    idle: () => set('idle'),
  };
}
