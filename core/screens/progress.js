// Grown-ups' corner → a reader's progress: for each game, levels completed,
// stars, and the words or skills they find tricky. On screen only: there is
// deliberately no export, print or share button, and nothing leaves the device.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, save } from '../context.js';
import { screen, topbar, avatarBadge, starRow } from '../ui.js';
import { allGames } from '../registry.js';
import { peekProgress, allStars } from '../progress.js';
import { resetProfile } from '../profiles.js';
import { STICKERS, unlockedStickers } from '../stickers.js';
import { confirmDialog } from '../dialog.js';
import { defaultBack } from './gate.js';

function gamePanel(profile, game, rerender) {
  const progress = peekProgress(profile, game.id);
  const report = typeof game.report === 'function' ? game.report(progress, game.levels) : null;
  if (!report) return null;

  const levelRows = (report.levels || []).map((l) => el('li', { class: 'progress-level' },
    el('span', { class: 'progress-level-name' }, el('strong', { text: l.name }), l.detail ? el('small', { text: l.detail }) : null),
    l.plays ? starRow(l.stars) : el('span', { class: 'hint', text: 'Not played yet' }),
    l.plays ? el('small', { class: 'progress-level-plays', text: `Played ${l.plays} ${l.plays === 1 ? 'time' : 'times'}` }) : null,
  ));

  async function resetGame() {
    const ok = await confirmDialog({
      title: `Reset ${profile.name}'s ${game.title}?`,
      message: 'Stars, best scores, unlocked levels and the tricky list for this game go back to the start. Other games are not changed. This can’t be undone.',
      confirmLabel: 'Reset this game', danger: true,
    });
    if (!ok) return;
    resetProfile(ctx.record, profile.id, game.id);
    save();
    rerender();
  }

  return el('section', { class: 'panel settings-section progress-game', 'aria-label': game.title },
    el('h2', {}, el('span', { class: 'progress-game-icon', 'aria-hidden': 'true' }, game.icon()), game.title),
    el('dl', { class: 'tally progress-summary' },
      ...report.summary.map(([label, value]) => el('div', {}, el('dt', { text: label }), el('dd', { text: value }))),
      el('div', {}, el('dt', { text: 'Stars' }), el('dd', { text: `${(report.levels || []).reduce((n, l) => n + l.stars, 0)}` }))),
    report.skills && report.skills.length
      ? el('div', { class: 'progress-skills' },
        el('h3', { text: report.skillsTitle || 'Skills' }),
        el('ul', { class: 'progress-skill-list' }, ...report.skills.map((sk) => el('li', {}, el('strong', { text: sk.label }), ' ', el('span', { text: sk.detail })))))
      : null,
    el('h3', { text: report.trickyTitle || 'Tricky things' }),
    report.tricky.length
      ? el('ul', { class: 'tricky-list' }, ...report.tricky.map((t) => el('li', { class: 'tricky-item' }, el('strong', { text: t.label }), el('small', { text: t.detail }))))
      : el('p', { class: 'hint left', text: 'Nothing tricky yet.' }),
    report.trickyHint ? el('p', { class: 'hint left', text: report.trickyHint }) : null,
    el('h3', { text: 'Levels' }),
    el('ol', { class: 'progress-levels' }, ...levelRows),
    el('button', { type: 'button', class: 'small-button danger', on: { click: resetGame } }, `Reset ${game.title}`),
  );
}

register('progress', ({ profileId, back = defaultBack() } = {}) => {
  const profile = ctx.record.profiles.find((p) => p.id === profileId);
  if (!profile) return { redirect: 'settings', params: { back } };

  const body = el('div', { class: 'settings-grid' });
  const render = () => body.replaceChildren(...allGames().map((g) => gamePanel(profile, g, render)).filter(Boolean));
  render();

  const node = screen('progress',
    topbar({ title: `${profile.name}’s progress`, back: () => go(back.name, back.params), backLabel: 'Back to settings' }),
    el('div', { class: 'player-bar' },
      avatarBadge(profile, { size: 'md' }),
      el('span', { class: 'player-name', text: profile.name }),
      el('span', { class: 'player-stat', 'aria-label': `${allStars(profile)} stars in all` },
        el('span', { class: 'star on', 'aria-hidden': 'true', text: '★' }), ` ${allStars(profile)} in all`),
      el('span', { class: 'player-stat', text: `📒 ${unlockedStickers(allStars(profile)).length} of ${STICKERS.length} stickers` })),
    el('p', { class: 'hint', text: 'This view is for grown-ups, on this screen only. Nothing here is saved anywhere else or shared.' }),
    body,
  );
  return { node, title: 'Progress' };
});
