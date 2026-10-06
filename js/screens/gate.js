// A simple grown-up gate: press and hold for 3 seconds.
// Little hands tap; grown-ups can read the instruction and hold.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx } from '../context.js';
import { screen, topbar } from '../ui.js';

export const HOLD_MS = 3000;

register('gate', ({ next = 'settings', from = 'map' } = {}) => {
  let timer = null;
  const back = () => go(from === 'profiles' || !ctx.record.activeProfileId ? 'profiles' : 'map');

  const button = el('button', { type: 'button', class: 'hold-button', 'aria-describedby': 'gate-help' },
    el('span', { class: 'hold-fill', 'aria-hidden': 'true' }),
    el('span', { class: 'hold-label', text: 'Press and hold' }));

  function start(e) {
    if (e.type === 'keydown' && (e.repeat || (e.key !== 'Enter' && e.key !== ' '))) return;
    e.preventDefault();
    if (timer) return;
    button.classList.add('holding');
    timer = setTimeout(() => {
      timer = null;
      ctx.sfx?.play('correct');
      go(next, { from });
    }, HOLD_MS);
  }
  function stop() {
    clearTimeout(timer);
    timer = null;
    button.classList.remove('holding');
  }
  button.addEventListener('pointerdown', start);
  button.addEventListener('keydown', start);
  for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur']) button.addEventListener(type, stop);
  button.addEventListener('contextmenu', (e) => e.preventDefault());

  const node = screen('gate',
    topbar({ title: 'Grown-ups only', back }),
    el('div', { class: 'panel gate-panel' },
      el('h2', { text: 'Are you a grown-up?' }),
      el('p', { id: 'gate-help', text: 'Press and hold the button for 3 seconds to open settings.' }),
      button,
    ),
  );
  return { node, title: 'Grown-ups', focus: button, destroy: stop };
});
