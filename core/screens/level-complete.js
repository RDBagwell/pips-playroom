// The "Level complete!" celebration every game shares. Moved from the
// Reading Game. A game passes its own tally rows (for example
// [['Words found', 8], ['First try', 7]]); points, star bonus and score follow.
//
//   screens: { complete: createLevelComplete('reading') }

import { el } from '../dom.js';
import { go } from '../router.js';
import { ctx, levelsOf, activeProfile, prefersReducedMotion } from '../context.js';
import { allStars } from '../progress.js';
import { freshStickerBook, newStickers, nextStickerText } from '../stickers.js';
import { screen } from '../ui.js';
import { createMascot } from '../mascot.js';
import { confetti } from '../effects.js';

export const createLevelComplete = (gameId) => ({ levelId, stars, bonus, base, score, outcome, tally = [] }) => {
  const levels = levelsOf(gameId);
  const level = levels.find((l) => l.id === levelId);
  if (!level) return { redirect: `${gameId}/map` };
  const next = levels.find((l) => l.id === levelId + 1);
  const play = (id) => go(`${gameId}/play`, { levelId: id });
  const calm = prefersReducedMotion();
  const timers = [];

  const starEls = [1, 2, 3].map((n) =>
    el('span', { class: `big-star${n <= stars ? ' earned' : ''}`, style: { '--n': String(n) }, 'aria-hidden': 'true', text: '★' }));
  const total = el('span', { class: 'tally-total', text: calm ? score.toLocaleString() : '0' });
  const newBest = outcome.newBest ? el('p', { class: 'new-best', text: 'New best!' }) : null;
  // Stars from every game feed the sticker book.
  const profile = activeProfile();
  const allTheStars = profile ? allStars(profile) : 0;
  const book = profile ? (profile.stickers ||= freshStickerBook()) : freshStickerBook();
  const stickerNews = newStickers({ ...book }, allTheStars).length
    ? el('p', { class: 'sticker-news', text: '📒 A new sticker is waiting in the playroom!' })
    : el('p', { class: 'sticker-news quiet', text: `📒 ${nextStickerText(allTheStars)}` });

  const buttons = el('div', { class: 'complete-actions' },
    next
      ? el('button', { type: 'button', class: 'big-button', 'data-autofocus': true, on: { click: () => play(next.id) } },
        'Next level ', el('span', { 'aria-hidden': 'true', text: '➜' }))
      : null,
    el('button', { type: 'button', class: `big-button ${next ? 'secondary' : ''}`, on: { click: () => play(levelId) } },
      el('span', { 'aria-hidden': 'true', text: '↻ ' }), 'Play again'),
    el('button', { type: 'button', class: 'big-button secondary', on: { click: () => go(`${gameId}/map`) } },
      el('span', { 'aria-hidden': 'true', text: '🗺️ ' }), 'Map'),
  );

  const node = screen('complete',
    el('div', { class: 'complete-panel panel' },
      el('div', { class: 'mascot-slot' }, createMascot('dance').node),
      el('h1', { class: 'complete-title', text: next ? 'Level complete!' : 'You finished every level!' }),
      el('p', { class: 'complete-level', text: `${level.emoji} ${level.name}` }),
      el('div', { class: 'big-stars', role: 'img', 'aria-label': `${stars} of 3 stars` }, ...starEls),
      el('dl', { class: 'tally' },
        ...tally.map(([label, value]) => el('div', {}, el('dt', { text: label }), el('dd', { text: `${value}` }))),
        el('div', {}, el('dt', { text: 'Points' }), el('dd', { text: base.toLocaleString() })),
        el('div', {}, el('dt', { text: 'Star bonus' }), el('dd', { text: `+${bonus}` })),
        el('div', { class: 'tally-sum' }, el('dt', { text: 'Score' }), el('dd', {}, total)),
      ),
      newBest,
      stickerNews,
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
};
