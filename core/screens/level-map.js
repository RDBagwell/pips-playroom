import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, activeProfile, settings, takeNotice } from '../context.js';
import { screen, topbar, iconButton, avatarBadge, starRow, notice } from '../ui.js';
import { isUnlocked, levelRecord, totalStars } from '../progress.js';
import { snakeCell, snakeLink } from '../path.js';

register('map', () => {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  const msg = takeNotice();
  const opts = { unlockAll: settings().unlockAll };
  const count = ctx.levels.length;

  // The newest open level, so we can scroll to it and make it bounce.
  const current = ctx.levels.filter((l) => isUnlocked(profile, l.id, opts) && !levelRecord(profile, l.id).plays)[0]
    || ctx.levels.filter((l) => isUnlocked(profile, l.id, opts)).slice(-1)[0];

  const stones = ctx.levels.map((level, i) => {
    const rec = levelRecord(profile, level.id);
    const open = isUnlocked(profile, level.id, opts);
    const label = open
      ? `Level ${level.id}, ${level.name}. ${rec.stars} of 3 stars.${rec.best ? ` Best score ${rec.best}.` : ''}`
      : `Level ${level.id}, ${level.name}. Locked.`;
    const button = el('button', {
      type: 'button',
      class: `stone${open ? '' : ' locked'}${level === current ? ' current' : ''}`,
      'aria-label': label,
      style: { '--stone-color': level.color },
      on: {
        click: (e) => {
          if (open) {
            ctx.sfx?.play('tap');
            go('play', { levelId: level.id });
          } else {
            ctx.sfx?.play('soft');
            e.currentTarget.classList.remove('wobble');
            void e.currentTarget.offsetWidth; // restart the animation
            e.currentTarget.classList.add('wobble');
            const prev = ctx.levels[i - 1];
            ctx.speech.say(`Finish ${prev ? prev.name : 'the level before'} to open this one!`);
          }
        },
      },
    },
    el('span', { class: 'stone-emoji', 'aria-hidden': 'true', text: open ? level.emoji : '🔒' }),
    el('span', { class: 'stone-number', 'aria-hidden': 'true', text: level.id }),
    );
    return el('li', { class: 'stone-wrap' },
      button,
      el('div', { class: 'stone-info', 'aria-hidden': 'true' },
        el('span', { class: 'stone-name', text: level.name }),
        open ? starRow(rec.stars) : null,
        rec.best ? el('span', { class: 'stone-best', text: `Best ${rec.best}` }) : null,
      ),
    );
  });

  const node = screen('map',
    topbar({
      back: () => go('profiles'),
      backLabel: 'Change reader',
      title: 'Level Map',
      actions: [
        iconButton({ icon: '🏆', label: 'Best readers', onClick: () => go('scores') }),
        iconButton({ icon: '⚙️', label: 'Grown-ups', onClick: () => go('gate', { next: 'settings', from: 'map' }) }),
      ],
    }),
    el('div', { class: 'player-bar' },
      avatarBadge(profile, { size: 'md' }),
      el('span', { class: 'player-name', text: profile.name }),
      el('span', { class: 'player-stat', 'aria-label': `${totalStars(profile)} stars` }, el('span', { class: 'star on', 'aria-hidden': 'true', text: '★' }), ` ${totalStars(profile)}`),
      el('span', { class: 'player-stat', 'aria-label': `${profile.totalScore} points` }, el('span', { 'aria-hidden': 'true', text: '🪙' }), ` ${profile.totalScore.toLocaleString()}`),
    ),
    msg && notice(msg),
    el('ol', { class: 'level-path', 'aria-label': `${count} levels` }, ...stones),
  );

  // Lay the stones out as a winding path: left to right, then back again.
  const path = node.querySelector('.level-path');
  const wide = window.matchMedia('(min-width: 700px)');
  function layout() {
    const cols = wide.matches ? 4 : 3;
    path.style.setProperty('--cols', String(cols));
    stones.forEach((li, i) => {
      const cell = snakeCell(i, cols);
      li.style.setProperty('--row', String(cell.row + 1));
      li.style.setProperty('--col', String(cell.col + 1));
      li.dataset.link = i === stones.length - 1 ? 'none' : snakeLink(i, cols);
    });
  }
  layout();
  wide.addEventListener('change', layout);

  // Bring the current level into view once the screen is on the page.
  requestAnimationFrame(() => {
    const cur = node.querySelector('.stone.current');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center', behavior: 'auto' });
  });

  return {
    node,
    title: 'Level map',
    focus: node.querySelector('.stone.current'),
    destroy: () => wide.removeEventListener('change', layout),
  };
});
