import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx } from '../context.js';
import { screen, topbar } from '../ui.js';
import { highScores, avatarFor } from '../profiles.js';

register('scores', ({ from = 'map' } = {}) => {
  const board = highScores(ctx.record, 10);
  const medals = ['🥇', '🥈', '🥉'];

  const list = board.length
    ? el('ol', { class: 'score-list' }, ...board.map((row, i) => {
      const a = avatarFor(row.avatar);
      return el('li', { class: 'score-row' },
        el('span', { class: 'score-rank', 'aria-label': `Number ${i + 1}` }, medals[i] || String(i + 1)),
        el('span', { class: 'avatar avatar-md', role: 'img', 'aria-label': a.label, text: a.emoji }),
        el('span', { class: 'score-name', text: row.name }),
        el('span', { class: 'score-stars', 'aria-label': `${row.stars} stars`, text: `★ ${row.stars}` }),
        el('span', { class: 'score-points', 'aria-label': `${row.score} points`, text: row.score.toLocaleString() }),
      );
    }))
    : el('p', { class: 'panel empty', text: 'No scores yet. Play a level to get on the board!' });

  const node = screen('scores',
    topbar({ title: 'Best Readers', back: () => go(from === 'profiles' || !ctx.record.activeProfileId ? 'profiles' : 'map') }),
    el('h2', { class: 'subtitle', text: 'Best Readers on This Device' }),
    list,
    el('p', { class: 'hint', text: 'Scores stay on this device. Nothing is sent anywhere.' }),
  );
  return { node, title: 'Best readers' };
});
