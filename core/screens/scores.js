import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, visibleGames } from '../context.js';
import { screen, topbar } from '../ui.js';
import { highScores, avatarFor } from '../profiles.js';
import { defaultBack } from './gate.js';

// "Best Readers on This Device": one board per game, plus all games together.
register('scores', ({ game = null, back = defaultBack() } = {}) => {
  const games = visibleGames();
  const gameId = games.some((g) => g.id === game) ? game : null;
  const board = highScores(ctx.record, 10, gameId);
  const medals = ['🥇', '🥈', '🥉'];

  const tabs = el('div', { class: 'score-tabs', role: 'group', 'aria-label': 'Which game' },
    ...[{ id: null, title: 'All games' }, ...games].map((g) => el('button', {
      type: 'button',
      class: 'small-button',
      'aria-pressed': String(g.id === gameId),
      on: { click: () => go('scores', { game: g.id, back }) },
    }, g.title)));

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
    topbar({ title: 'Best Readers', back: () => go(back.name, back.params) }),
    el('h2', { class: 'subtitle', text: 'Best Readers on This Device' }),
    games.length > 1 ? tabs : null,
    list,
    el('p', { class: 'hint', text: 'Scores stay on this device. Nothing is sent anywhere.' }),
  );
  return { node, title: 'Best readers' };
});
