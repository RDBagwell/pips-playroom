// Sticker art and scene pages, all original and drawn in code (SVG), in the
// same style as Pip: soft rounded shapes, dot eyes with a highlight, rosy
// cheeks. Each sticker is drawn in a 100 × 100 box.

import { svg } from './svg.js';

const INK = '#2D2440';
const CHEEK = '#FF8A80';

const eye = (x, y, r = 4.5) => [svg('circle', { cx: x, cy: y, r, fill: INK }), svg('circle', { cx: x + r * 0.35, cy: y - r * 0.35, r: r * 0.35, fill: '#fff' })];
const eyes = (x1, x2, y, r) => [...eye(x1, y, r), ...eye(x2, y, r)];
const cheeks = (x1, x2, y, r = 4.5) => [svg('circle', { cx: x1, cy: y, r, fill: CHEEK, opacity: 0.6 }), svg('circle', { cx: x2, cy: y, r, fill: CHEEK, opacity: 0.6 })];
const smile = (x, y, w = 8) => svg('path', { d: `M${x - w / 2} ${y} q${w / 2} ${w * 0.6} ${w} 0`, fill: 'none', stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' });
const p = (d, fill, extra = {}) => svg('path', { d, fill, ...extra });
const c = (cx, cy, r, fill, extra = {}) => svg('circle', { cx, cy, r, fill, ...extra });
const e = (cx, cy, rx, ry, fill, extra = {}) => svg('ellipse', { cx, cy, rx, ry, fill, ...extra });

const ART = {
  sun: () => [
    ...Array.from({ length: 10 }, (_, i) => p('M50 4 L56 20 L44 20 Z', '#FFB627', { transform: `rotate(${i * 36} 50 50)` })),
    c(50, 50, 28, '#FFC93C'), ...eyes(41, 59, 46, 4), ...cheeks(36, 64, 55), smile(50, 58, 12),
  ],
  fish: () => [
    p('M74 50 L94 34 L92 66 Z', '#FF9A5A'),
    e(48, 50, 32, 24, '#FFB84D'), p('M40 28 Q52 14 62 30 Z', '#FF9A5A'),
    p('M58 38 q6 12 0 24', 'none', { stroke: '#FF9A5A', 'stroke-width': 4, 'stroke-linecap': 'round' }),
    ...eye(32, 46, 5), smile(28, 58, 8), c(38, 56, 4, CHEEK, { opacity: 0.6 }),
  ],
  bunny: () => [
    e(36, 24, 9, 22, '#F4EEF9'), e(64, 24, 9, 22, '#F4EEF9'), e(36, 26, 4, 15, '#FFC4D6'), e(64, 26, 4, 15, '#FFC4D6'),
    e(50, 62, 30, 28, '#F4EEF9'), ...eyes(40, 60, 58, 4.5), ...cheeks(33, 67, 68),
    p('M46 66 L54 66 L50 71 Z', '#FF8FAB'), smile(50, 74, 8),
  ],
  flower: () => [
    p('M50 60 Q48 80 50 96', 'none', { stroke: '#3E9E68', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    e(62, 82, 12, 6, '#5CC689', { transform: 'rotate(-30 62 82)' }),
    ...[0, 60, 120, 180, 240, 300].map((r) => e(50, 22, 13, 17, '#FF9ED2', { transform: `rotate(${r} 50 42)` })),
    c(50, 42, 16, '#FFC93C'), ...eyes(44, 56, 40, 3), smile(50, 47, 7),
  ],
  crab: () => [
    p('M18 56 L8 44 M82 56 L92 44 M24 70 L12 80 M76 70 L88 80', 'none', { stroke: '#E8584A', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    c(14, 34, 10, '#FF6B5B'), c(86, 34, 10, '#FF6B5B'), p('M10 30 L18 36 M90 30 L82 36', 'none', { stroke: '#fff', 'stroke-width': 3 }),
    e(50, 62, 34, 24, '#FF6B5B'),
    p('M40 40 V30 M60 40 V30', 'none', { stroke: '#E8584A', 'stroke-width': 4 }),
    c(40, 28, 7, '#fff'), c(60, 28, 7, '#fff'), ...eyes(40, 60, 28, 4), ...cheeks(32, 68, 64), smile(50, 66, 12),
  ],
  star: () => [
    p('M50 6 L62 36 L94 38 L69 58 L77 90 L50 72 L23 90 L31 58 L6 38 L38 36 Z', '#FFC93C', { stroke: '#FFB627', 'stroke-width': 3, 'stroke-linejoin': 'round' }),
    ...eyes(42, 58, 48, 4), ...cheeks(36, 64, 57, 4), smile(50, 58, 9),
  ],
  frog: () => [
    e(50, 64, 36, 26, '#5CC689'), c(32, 36, 13, '#5CC689'), c(68, 36, 13, '#5CC689'),
    c(32, 35, 8, '#fff'), c(68, 35, 8, '#fff'), ...eyes(32, 68, 36, 4.5), ...cheeks(28, 72, 66, 5),
    p('M34 70 Q50 82 66 70', 'none', { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    e(26, 88, 12, 6, '#3E9E68'), e(74, 88, 12, 6, '#3E9E68'),
  ],
  balloon: () => [
    p('M50 72 Q44 84 52 92 Q58 98 50 100', 'none', { stroke: '#9B7BE6', 'stroke-width': 2.5 }),
    e(50, 40, 28, 34, '#FF7A6B'), p('M46 73 L54 73 L50 67 Z', '#E8584A'),
    e(40, 28, 6, 10, '#fff', { opacity: 0.45 }), ...eyes(42, 58, 40, 3.5), ...cheeks(36, 64, 49, 4), smile(50, 50, 9),
  ],
  whale: () => [
    p('M82 50 Q96 30 98 22 Q88 34 82 36 Q86 26 80 18 Q78 34 76 44 Z', '#4DB6F0'),
    p('M8 58 Q8 30 44 28 Q80 28 84 54 Q86 80 46 82 Q10 82 8 58 Z', '#4DB6F0'),
    p('M12 64 Q44 80 80 62 Q76 80 46 82 Q14 82 12 64 Z', '#BFE8FF'),
    p('M36 22 Q34 12 30 8 M36 22 Q38 12 44 9', 'none', { stroke: '#7FD0F8', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    ...eye(30, 50, 4.5), c(24, 60, 4.5, CHEEK, { opacity: 0.6 }), smile(36, 62, 10),
  ],
  moon: () => [
    p('M62 8 A42 42 0 1 0 92 70 A34 34 0 1 1 62 8 Z', '#FFE08A'),
    p('M30 48 q5 4 10 0', 'none', { stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
    c(28, 58, 4.5, CHEEK, { opacity: 0.6 }), smile(40, 64, 8),
    c(78, 20, 3, '#FFE08A'), c(88, 34, 2, '#FFE08A'),
  ],
  ladybug: () => [
    c(50, 24, 15, INK), p('M44 12 Q38 2 32 4 M56 12 Q62 2 68 4', 'none', { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    c(44, 22, 3.5, '#fff'), c(56, 22, 3.5, '#fff'), c(45, 22, 1.8, INK), c(57, 22, 1.8, INK),
    e(50, 60, 34, 32, '#FF5B4E'), p('M50 30 V92', 'none', { stroke: INK, 'stroke-width': 3 }),
    c(34, 50, 6, INK), c(66, 50, 6, INK), c(36, 74, 5, INK), c(64, 74, 5, INK), c(50, 88, 3, INK),
  ],
  octopus: () => [
    ...[18, 32, 46, 60, 74].map((x, i) => p(`M${x + 4} 58 Q${x - 2} 78 ${x + 6} 92`, 'none', { stroke: '#9B7BE6', 'stroke-width': 9, 'stroke-linecap': 'round', transform: i % 2 ? '' : 'translate(2 0)' })),
    e(50, 42, 32, 30, '#B49AF0'), ...eyes(40, 60, 42, 5), ...cheeks(32, 68, 52), smile(50, 54, 10),
    e(40, 24, 7, 4, '#fff', { opacity: 0.4 }),
  ],
  rainbow: () => [
    ...['#FF7A6B', '#FFB84D', '#FFC93C', '#5CC689', '#4DB6F0', '#9B7BE6'].map((col, i) => p(`M${10 + i * 5} 74 A${40 - i * 5} ${40 - i * 5} 0 0 1 ${90 - i * 5} 74`, 'none', { stroke: col, 'stroke-width': 5.5 })),
    e(18, 78, 14, 9, '#fff'), e(82, 78, 14, 9, '#fff'), e(26, 76, 9, 8, '#fff'), e(74, 76, 9, 8, '#fff'),
  ],
  kitten: () => [
    p('M24 40 L22 12 L44 28 Z', '#FFB84D'), p('M76 40 L78 12 L56 28 Z', '#FFB84D'), p('M27 34 L26 20 L37 28 Z', '#FFC4D6'), p('M73 34 L74 20 L63 28 Z', '#FFC4D6'),
    e(50, 54, 32, 30, '#FFB84D'), p('M40 30 q2 6 0 12 M50 28 v12 M60 30 q-2 6 0 12', 'none', { stroke: '#E8954A', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    ...eyes(39, 61, 54, 4.5), ...cheeks(30, 70, 64), p('M46 62 L54 62 L50 66 Z', '#FF8FAB'),
    p('M50 66 q-4 6 -9 3 M50 66 q4 6 9 3', 'none', { stroke: INK, 'stroke-width': 2.2, 'stroke-linecap': 'round' }),
    p('M20 62 H6 M20 68 H8 M80 62 H94 M80 68 H92', 'none', { stroke: '#E8954A', 'stroke-width': 2 }),
  ],
  starfish: () => [
    p('M50 8 Q56 36 60 38 Q90 34 92 40 Q68 56 70 60 Q82 88 76 90 Q54 72 50 72 Q46 72 24 90 Q18 88 30 60 Q32 56 8 40 Q10 34 40 38 Q44 36 50 8 Z', '#FF9A5A'),
    ...[[50, 24], [76, 42], [66, 76], [34, 76], [24, 42]].map(([x, y]) => c(x, y, 2.5, '#FFD3A8')),
    ...eyes(43, 57, 48, 3.5), ...cheeks(38, 62, 56, 3.5), smile(50, 57, 7),
  ],
  rocket: () => [
    p('M38 70 L24 86 L36 82 Z M62 70 L76 86 L64 82 Z', '#FF7A6B'),
    p('M50 6 Q72 26 66 76 H34 Q28 26 50 6 Z', '#F4EEF9'), p('M50 6 Q60 14 64 26 H36 Q40 14 50 6 Z', '#FF7A6B'),
    c(50, 44, 10, '#4DB6F0', { stroke: '#9B7BE6', 'stroke-width': 3 }), c(47, 41, 3, '#fff', { opacity: 0.7 }),
    p('M40 76 Q50 100 60 76 Z', '#FFC93C'), p('M45 76 Q50 90 55 76 Z', '#FF9A5A'),
  ],
  snail: () => [
    p('M10 84 Q12 70 30 70 H76 Q90 70 92 60 Q94 48 86 46 Q80 46 80 54', '#FFD3A8'),
    p('M86 46 L84 34 M90 48 L94 36', 'none', { stroke: '#E8B88A', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
    c(84, 33, 3, INK), c(94, 35, 3, INK),
    c(46, 50, 28, '#9B7BE6'), p('M46 50 m-4 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -18 0 a16 16 0 1 1 30 0', 'none', { stroke: '#7A5ACF', 'stroke-width': 4, 'stroke-linecap': 'round' }),
    c(80, 60, 3.5, CHEEK, { opacity: 0.6 }), smile(86, 62, 6),
  ],
  jellyfish: () => [
    ...[30, 42, 54, 66].map((x) => p(`M${x} 52 q-6 12 0 22 q6 10 0 20`, 'none', { stroke: '#FF9ED2', 'stroke-width': 4, 'stroke-linecap': 'round' })),
    p('M14 54 Q14 12 50 12 Q86 12 86 54 Q78 48 68 54 Q58 48 50 54 Q42 48 32 54 Q22 48 14 54 Z', '#FFC4E1'),
    ...eyes(40, 60, 36, 4), ...cheeks(32, 68, 44), smile(50, 44, 8),
  ],
  cupcake: () => [
    p('M24 54 L32 92 H68 L76 54 Z', '#4DB6F0'), p('M36 56 L40 92 M50 56 V92 M64 56 L60 92', 'none', { stroke: '#3799D0', 'stroke-width': 2.5 }),
    p('M18 56 Q16 40 30 38 Q32 22 50 22 Q68 22 70 38 Q84 40 82 56 Z', '#FF9ED2'),
    c(50, 14, 8, '#FF5B4E'), p('M50 6 q4 -4 8 -2', 'none', { stroke: '#3E9E68', 'stroke-width': 2.5 }),
    ...[[34, 44, '#FFC93C'], [48, 34, '#5CC689'], [62, 44, '#4DB6F0'], [42, 50, '#fff']].map(([x, y, f]) => svg('rect', { x, y, width: 6, height: 3, rx: 1.5, fill: f, transform: `rotate(${x} ${x} ${y})` })),
    ...eyes(42, 58, 70, 3.5), smile(50, 79, 8),
  ],
  turtle: () => [
    e(16, 64, 12, 10, '#86C55A'), e(30, 82, 8, 7, '#86C55A'), e(70, 82, 8, 7, '#86C55A'), p('M86 66 L96 72 L86 74 Z', '#86C55A'),
    p('M24 72 Q24 30 56 30 Q88 30 88 72 Z', '#5CC689'),
    p('M56 30 V72 M38 40 L46 56 L66 56 L74 40 M46 56 L36 72 M66 56 L76 72', 'none', { stroke: '#3E9E68', 'stroke-width': 3 }),
    svg('rect', { x: 22, y: 68, width: 68, height: 8, rx: 4, fill: '#3E9E68' }),
    ...eye(12, 60, 3.5), c(10, 68, 3.5, CHEEK, { opacity: 0.6 }),
  ],
  shell: () => [
    p('M50 10 L90 74 Q50 96 10 74 Z', '#FFC4D6'),
    p('M50 10 L24 84 M50 10 L40 90 M50 10 L60 90 M50 10 L76 84', 'none', { stroke: '#FF9EBB', 'stroke-width': 3 }),
    svg('rect', { x: 38, y: 84, width: 24, height: 12, rx: 6, fill: '#FF9EBB' }),
  ],
  sailboat: () => [
    p('M50 10 V66', 'none', { stroke: '#C4733A', 'stroke-width': 4 }),
    p('M54 14 Q84 40 80 62 H54 Z', '#fff', { stroke: '#BFD9EC', 'stroke-width': 2 }), p('M46 22 Q24 46 26 62 H46 Z', '#FFC93C'),
    p('M50 10 L66 14 L50 18 Z', '#FF7A6B'),
    p('M12 68 H88 L76 88 H24 Z', '#FF7A6B'), ...eyes(40, 60, 76, 3), smile(50, 81, 7),
  ],
  owlet: () => [
    p('M28 30 L22 10 Q36 18 44 24 Z', '#C4733A'), p('M72 30 L78 10 Q64 18 56 24 Z', '#C4733A'),
    e(50, 56, 34, 38, '#E8954A'), e(50, 70, 22, 22, '#FDE6BF'),
    c(36, 46, 12, '#FFF9EE', { stroke: '#C4733A', 'stroke-width': 3 }), c(64, 46, 12, '#FFF9EE', { stroke: '#C4733A', 'stroke-width': 3 }),
    ...eyes(37, 63, 47, 5.5), ...cheeks(24, 76, 60), p('M50 52 L45 58 Q50 64 55 58 Z', '#FFB627'),
    p('M40 72 q4 4 8 0 M52 72 q4 4 8 0 M46 80 q4 4 8 0', 'none', { stroke: '#EDBE83', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
  ],
  fox: () => [
    p('M78 72 Q98 60 90 40 Q86 62 70 66 Z', '#E8743B'), p('M90 40 Q94 48 92 54 L86 50 Z', '#fff'),
    p('M22 32 L28 8 L44 28 Z', '#E8743B'), p('M78 32 L72 8 L56 28 Z', '#E8743B'),
    p('M18 34 Q50 14 82 34 Q84 64 50 88 Q16 64 18 34 Z', '#FF8A4C'),
    p('M24 52 Q36 54 50 88 Q64 54 76 52 Q70 76 50 88 Q30 76 24 52 Z', '#FFF4E8'),
    ...eyes(38, 62, 46, 4.5), ...cheeks(30, 70, 56), c(50, 70, 5, INK), smile(50, 76, 6),
  ],
};

/** A sticker as an <svg> (100 × 100). */
export function stickerSvg(id, { title = null, locked = false } = {}) {
  const draw = ART[id];
  const node = svg('svg', { viewBox: '0 0 100 100', class: `sticker-art${locked ? ' sticker-locked' : ''}`, focusable: 'false', 'aria-hidden': title ? 'false' : 'true' },
    ...(draw ? draw() : []));
  if (title) {
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', title);
  }
  return node;
}

export const ART_IDS = Object.keys(ART);

const SCENE_ART = {
  beach: () => [
    svg('rect', { width: 400, height: 300, fill: '#BFE8FF' }),
    c(330, 60, 30, '#FFE08A'),
    e(90, 60, 40, 14, '#fff', { opacity: 0.85 }), e(120, 54, 26, 14, '#fff', { opacity: 0.85 }),
    p('M0 150 Q100 136 200 150 T400 150 V230 H0 Z', '#4DB6F0'),
    p('M0 172 Q50 162 100 172 T200 172 T300 172 T400 172', 'none', { stroke: '#BFE8FF', 'stroke-width': 4, opacity: 0.7 }),
    p('M0 214 Q120 196 240 212 T400 206 V300 H0 Z', '#FFE3B0'),
    ...[[60, 260], [180, 276], [320, 250], [260, 286]].map(([x, y]) => c(x, y, 3, '#E9C98F')),
  ],
  garden: () => [
    svg('rect', { width: 400, height: 300, fill: '#D8F1FF' }),
    e(300, 50, 44, 16, '#fff', { opacity: 0.9 }), e(330, 42, 26, 14, '#fff', { opacity: 0.9 }),
    ...Array.from({ length: 11 }, (_, i) => svg('rect', { x: 8 + i * 36, y: 120, width: 22, height: 70, rx: 6, fill: '#FFF4DE', stroke: '#EAD6AC', 'stroke-width': 2 })),
    svg('rect', { x: 0, y: 140, width: 400, height: 10, fill: '#EAD6AC' }),
    p('M0 180 Q100 160 200 176 T400 170 V300 H0 Z', '#A3D977'),
    p('M0 236 Q140 214 260 232 T400 228 V300 H0 Z', '#86C55A'),
  ],
  night: () => [
    svg('rect', { width: 400, height: 300, fill: '#2D2E66' }),
    ...[[40, 40], [120, 70], [200, 30], [260, 90], [340, 50], [80, 120], [300, 140], [170, 110], [380, 110]].map(([x, y], i) => c(x, y, i % 3 ? 1.8 : 2.8, '#FFF6C9')),
    p('M0 230 Q80 190 170 220 T330 210 T400 200 V300 H0 Z', '#3B3F82'),
    p('M0 262 Q120 236 230 258 T400 250 V300 H0 Z', '#4B4F96'),
  ],
};

/** A scene page as an <svg> background (4:3). */
export function sceneSvg(id) {
  return svg('svg', { viewBox: '0 0 400 300', class: 'scene-art', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid slice' },
    ...(SCENE_ART[id] ? SCENE_ART[id]() : []));
}
