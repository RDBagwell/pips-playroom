// The playroom: one big, friendly card per game, with this reader's stars in
// each game and in all of them. Pip greets the reader by name.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, activeProfile, visibleGames, takeNotice } from '../context.js';
import { screen, topbar, iconButton, avatarBadge, notice } from '../ui.js';
import { createMascot } from '../mascot.js';
import { peekProgress, totalStars, allStars } from '../progress.js';
import { MAX_STARS } from '../scoring.js';

export function greeting(name) {
  return `Hi, ${name}! What would you like to play?`;
}

register('hub', ({ greet = false } = {}) => {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  const msg = takeNotice();
  const games = visibleGames();
  const here = { name: 'hub' };
  const hello = greeting(profile.name);

  const cards = games.map((game) => {
    const ready = game.status === 'ready';
    const stars = totalStars(peekProgress(profile, game.id));
    const max = game.levels.length * MAX_STARS;
    const label = ready
      ? `${game.title}. ${game.tagline} ${stars} of ${max} stars.`
      : `${game.title}. Not available right now.`;
    return el('li', {},
      el('button', {
        type: 'button',
        class: `game-card${ready ? '' : ' unavailable'}`,
        'aria-label': label,
        dataset: { game: game.id },
        style: { '--game-color': game.color || '#FFC93C' },
        on: {
          click: () => {
            if (!ready) {
              ctx.sfx?.play('soft');
              ctx.speech.say(`${game.title} needs a grown-up to help. Try another game!`);
              return;
            }
            ctx.sfx?.play('tap');
            go(`${game.id}/${game.start}`);
          },
        },
      },
      el('span', { class: 'game-card-art', 'aria-hidden': 'true' }, game.icon()),
      el('span', { class: 'game-card-title', 'aria-hidden': 'true', text: game.title }),
      el('span', { class: 'game-card-tagline', 'aria-hidden': 'true', text: ready ? game.tagline : 'Not available right now' }),
      ready
        ? el('span', { class: 'game-card-stars', 'aria-hidden': 'true' },
          el('span', { class: 'star on', text: '★' }), ` ${stars} of ${max}`)
        : null,
      ));
  });

  const total = allStars(profile);
  const node = screen('hub',
    topbar({
      back: () => go('profiles'),
      backLabel: 'Change reader',
      title: 'Pip’s Playroom',
      actions: [
        iconButton({ icon: '🏆', label: 'Best scores', onClick: () => go('scores', { back: here }) }),
        iconButton({ icon: '⚙️', label: 'Grown-ups', onClick: () => go('gate', { next: 'settings', back: here }) }),
      ],
    }),
    el('div', { class: 'hub-hello' },
      el('div', { class: 'mascot-slot' }, createMascot(greet ? 'hello' : 'idle').node),
      el('p', { class: 'speech-bubble', text: hello }),
    ),
    el('div', { class: 'player-bar' },
      avatarBadge(profile, { size: 'md' }),
      el('span', { class: 'player-name', text: profile.name }),
      el('span', { class: 'player-stat', 'aria-label': `${total} stars in all` },
        el('span', { class: 'star on', 'aria-hidden': 'true', text: '★' }), ` ${total} in all`),
    ),
    msg && notice(msg),
    cards.length
      ? el('ul', { class: 'game-grid', role: 'list', 'aria-label': 'Games' }, ...cards)
      : el('p', { class: 'panel empty', text: 'A grown-up has put the games away for now. Ask them to switch one on in ⚙️ settings.' }),
  );

  if (greet) ctx.speech.say(hello);

  return { node, title: 'Playroom', focus: node.querySelector('.game-card') };
});
