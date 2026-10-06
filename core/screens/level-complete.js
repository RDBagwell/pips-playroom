import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, prefersReducedMotion } from '../context.js';
import { screen } from '../ui.js';
import { createMascot } from '../mascot.js';
import { confetti } from '../effects.js';

register('complete', ({ levelId, stars, bonus, base, score, outcome, firstTry, goal }) => {
  const level = ctx.levels.find((l) => l.id === levelId);
  const next = ctx.levels.find((l) => l.id === levelId + 1);
  const calm = prefersReducedMotion();
  const timers = [];

  const starEls = [1, 2, 3].map((n) =>
    el('span', { class: `big-star${n <= stars ? ' earned' : ''}`, style: { '--n': String(n) }, 'aria-hidden': 'true', text: '★' }));
  const total = el('span', { class: 'tally-total', text: calm ? score.toLocaleString() : '0' });
  const newBest = outcome.newBest ? el('p', { class: 'new-best', text: 'New best!' }) : null;

  const buttons = el('div', { class: 'complete-actions' },
    next
      ? el('button', { type: 'button', class: 'big-button', 'data-autofocus': true, on: { click: () => go('play', { levelId: next.id }) } },
        'Next level ', el('span', { 'aria-hidden': 'true', text: '➜' }))
      : null,
    el('button', { type: 'button', class: `big-button ${next ? 'secondary' : ''}`, on: { click: () => go('play', { levelId }) } },
      el('span', { 'aria-hidden': 'true', text: '↻ ' }), 'Play again'),
    el('button', { type: 'button', class: 'big-button secondary', on: { click: () => go('map') } },
      el('span', { 'aria-hidden': 'true', text: '🗺️ ' }), 'Map'),
  );

  const node = screen('complete',
    el('div', { class: 'complete-panel panel' },
      el('div', { class: 'mascot-slot' }, createMascot('dance').node),
      el('h1', { class: 'complete-title', text: next ? 'Level complete!' : 'You finished every level!' }),
      el('p', { class: 'complete-level', text: `${level.emoji} ${level.name}` }),
      el('div', { class: 'big-stars', role: 'img', 'aria-label': `${stars} of 3 stars` }, ...starEls),
      el('dl', { class: 'tally' },
        el('div', {}, el('dt', { text: 'Words found' }), el('dd', { text: `${goal}` })),
        el('div', {}, el('dt', { text: 'First try' }), el('dd', { text: `${firstTry}` })),
        el('div', {}, el('dt', { text: 'Points' }), el('dd', { text: base.toLocaleString() })),
        el('div', {}, el('dt', { text: 'Star bonus' }), el('dd', { text: `+${bonus}` })),
        el('div', { class: 'tally-sum' }, el('dt', { text: 'Score' }), el('dd', {}, total)),
      ),
      newBest,
      outcome.unlockedNext && next ? el('p', { class: 'unlocked', text: `${next.emoji} ${next.name} is open!` }) : null,
      buttons,
    ),
  );

  // Celebrate: fanfare, stars pop in one by one, then the score counts up.
  ctx.sfx?.play('fanfare');
  requestAnimationFrame(() => {
    starEls.slice(0, stars).forEach((s, i) => timers.push(setTimeout(() => confetti(s, { count: 14 }), 400 + (i + 1) * 380)));
  });
  if (!calm) {
    for (let n = 1; n <= stars; n += 1) timers.push(setTimeout(() => ctx.sfx?.play('star', n), 350 + n * 380));
    const start = performance.now() + 350 + stars * 380;
    const duration = 700;
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      total.textContent = Math.round(score * t).toLocaleString();
      if (t < 1) timers.push(requestAnimationFrame(step));
    };
    timers.push(requestAnimationFrame(step));
  }
  const cheer = [
    next ? 'Level complete!' : 'Wow! You finished every level!',
    `You earned ${stars} ${stars === 1 ? 'star' : 'stars'}!`,
    outcome.newBest ? 'That is a new best!' : '',
  ];
  ctx.speech.say(cheer);

  return {
    node,
    title: 'Level complete',
    destroy() {
      timers.forEach((t) => {
        clearTimeout(t);
        cancelAnimationFrame(t);
      });
    },
  };
});
