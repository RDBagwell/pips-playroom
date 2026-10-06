// Visual "juice": confetti bursts and points that fly up to the score.

import { el } from './dom.js';
import { prefersReducedMotion } from './context.js';

const COLORS = ['#FFC93C', '#FF7A6B', '#4DB6F0', '#5CC689', '#9B7BE6', '#FF9ED2'];

function layer() {
  let l = document.getElementById('fx-layer');
  if (!l) {
    l = el('div', { id: 'fx-layer', class: 'fx-layer', 'aria-hidden': 'true' });
    document.body.append(l);
  }
  return l;
}

function centerOf(node) {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function confetti(fromNode, { count = 22 } = {}) {
  if (prefersReducedMotion()) return;
  const { x, y } = centerOf(fromNode);
  const burst = el('div', { class: 'confetti', style: { left: `${x}px`, top: `${y}px` } });
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 70 + Math.random() * 90;
    const star = i % 3 === 0;
    burst.append(el('span', {
      class: star ? 'bit bit-star' : 'bit',
      text: star ? '★' : '',
      style: {
        '--dx': `${Math.cos(angle) * dist}px`,
        '--dy': `${Math.sin(angle) * dist - 40}px`,
        '--rot': `${Math.round(Math.random() * 540 - 270)}deg`,
        '--c': COLORS[i % COLORS.length],
        '--d': `${Math.round(Math.random() * 60)}ms`,
      },
    }));
  }
  layer().append(burst);
  setTimeout(() => burst.remove(), 1100);
}

export function flyPoints(fromNode, toNode, text) {
  const a = centerOf(fromNode);
  const b = centerOf(toNode);
  const bump = () => {
    toNode.classList.remove('bump');
    void toNode.offsetWidth;
    toNode.classList.add('bump');
  };
  if (prefersReducedMotion()) {
    bump();
    return;
  }
  const chip = el('span', {
    class: 'fly-points',
    text,
    style: { left: `${a.x}px`, top: `${a.y}px`, '--tx': `${b.x - a.x}px`, '--ty': `${b.y - a.y}px` },
  });
  layer().append(chip);
  setTimeout(() => {
    chip.remove();
    bump();
  }, 650);
}
