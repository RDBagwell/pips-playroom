// The playroom: one big, friendly card per game, with this reader's stars in
// each game and in all of them. Pip greets the reader by name.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, activeProfile, visibleGames, takeNotice, save } from '../context.js';
import { screen, topbar, iconButton, avatarBadge, notice } from '../ui.js';
import { createMascot } from '../mascot.js';
import { confetti } from '../effects.js';
import { peekProgress, totalStars, allStars } from '../progress.js';
import { MAX_STARS } from '../scoring.js';
import { STICKERS, freshStickerBook, unlockedStickers, newStickers, markSeen, nextStickerText } from '../stickers.js';
import { stickerSvg } from '../sticker-art.js';

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
    return el('li', {},
      el('button', {
        type: 'button',
        class: `game-card${ready ? '' : ' unavailable'}`,
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
      // Named by its visible text (title, tagline, stars), so what's on screen is what voice control can say.
      el('span', { class: 'game-card-title', text: game.title }),
      el('span', { class: 'sr-only', text: '. ' }),
      el('span', { class: 'game-card-tagline', text: ready ? game.tagline : 'Not available right now' }),
      ready
        ? el('span', { class: 'game-card-stars' },
          el('span', { class: 'star on', 'aria-hidden': 'true', text: '★' }), ` ${stars} of ${max}`, el('span', { class: 'sr-only', text: ' stars' }))
        : null,
      ));
  });

  const total = allStars(profile);
  if (!profile.stickers) profile.stickers = freshStickerBook();
  const unlocked = unlockedStickers(total);
  const fresh = newStickers(profile.stickers, total);
  const latest = unlocked[unlocked.length - 1];

  const stickerBanner = el('button', {
    type: 'button', class: 'sticker-banner',
    on: { click: () => { ctx.sfx?.play('tap'); go('stickers'); } },
  },
  el('span', { class: 'sticker-banner-art', 'aria-hidden': 'true' }, latest ? stickerSvg(latest.id) : stickerSvg(STICKERS[0].id, { locked: true })),
  el('span', { class: 'sticker-banner-text' },
    el('strong', { text: 'Sticker Book' }),
    el('span', { text: `${unlocked.length} of ${STICKERS.length} stickers · ${nextStickerText(total)}` })));

  // A gentle celebration for stickers earned since the last visit.
  let party = null;
  let partyLines = [];
  if (fresh.length) {
    const names = fresh.map((st) => st.name);
    const said = fresh.length === 1 ? `a ${names[0]}` : `${fresh.length} new stickers`;
    partyLines = [`You got ${said}!`, 'Put it in your sticker book!'];
    party = el('section', { class: 'panel sticker-party', 'aria-labelledby': 'party-title' },
      el('h2', { id: 'party-title', text: fresh.length === 1 ? 'New sticker!' : `${fresh.length} new stickers!` }),
      el('div', { class: 'party-stickers' }, ...fresh.slice(-4).map((st) => stickerSvg(st.id, { title: st.name }))),
      el('div', { class: 'party-actions' },
        el('button', { type: 'button', class: 'big-button', 'data-autofocus': true, on: { click: () => go('stickers') } },
          el('span', { 'aria-hidden': 'true', text: '📒 ' }), 'Open my sticker book'),
        el('button', { type: 'button', class: 'big-button secondary', on: { click: () => party.remove() } }, 'Later')));
    markSeen(profile.stickers, total);
    save();
  }

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
      el('span', { class: 'player-stat' },
        el('span', { class: 'star on', 'aria-hidden': 'true', text: '★' }), ` ${total}`, el('span', { class: 'sr-only', text: ' stars' }), ' in all'),
    ),
    msg && notice(msg),
    party,
    stickerBanner,
    cards.length
      ? el('ul', { class: 'game-grid', role: 'list', 'aria-label': 'Games' }, ...cards)
      : el('p', { class: 'panel empty', text: 'A grown-up has put the games away for now. Ask them to switch one on in ⚙️ settings.' }),
  );

  const lines = [greet ? hello : null, ...partyLines].filter(Boolean);
  if (lines.length) ctx.speech.say(lines);
  if (party) {
    ctx.sfx?.play('fanfare');
    requestAnimationFrame(() => party.isConnected && confetti(party.querySelector('.party-stickers'), { count: 26 }));
  }

  return { node, title: 'Playroom', focus: party ? party.querySelector('[data-autofocus]') : node.querySelector('.game-card') };
});
