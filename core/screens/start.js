import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx } from '../context.js';
import { screen } from '../ui.js';
import { createMascot } from '../mascot.js';

register('start', () => {
  const play = el('button', { type: 'button', class: 'big-button start-button', on: { click: begin } },
    el('span', { 'aria-hidden': 'true', text: '▶' }), ' Tap to play');

  function begin() {
    // The first sound must happen inside a tap: iOS/Safari blocks speech and
    // audio until the page has been touched.
    ctx.sfx?.unlock();
    ctx.sfx?.play('tap');
    const hasProfiles = ctx.record.profiles.length > 0;
    ctx.speech.say(hasProfiles ? "Hi! Who's playing today?" : "Hi! Let's make your reader.");
    go(hasProfiles ? 'profiles' : 'new-profile');
  }

  const node = screen('start',
    el('div', { class: 'start-hero' },
      el('div', { class: 'mascot-slot' }, createMascot('hello').node),
      el('h1', { class: 'game-title' }, el('span', { text: 'Pip’s' }), ' ', el('span', { text: 'Playroom' })),
      el('p', { class: 'tagline', text: 'Games for reading, numbers and more!' }),
      play,
    ),
  );
  return { node };
});

register('unsupported', () => {
  const node = screen('start',
    el('div', { class: 'start-hero' },
      el('div', { class: 'mascot-slot' }, createMascot('idle').node),
      el('h1', { class: 'game-title', text: 'Pip’s Playroom' }),
      el('div', { class: 'panel' },
        el('h2', { text: 'A note for grown-ups' }),
        el('p', { text: 'These games talk! Pip the owl says words and numbers out loud, and your child answers on the screen. This browser can’t speak, so the games can’t run here.' }),
        el('p', { text: 'Please try a recent version of Safari, Chrome, Edge or Firefox. On some computers you may also need to install a text-to-speech voice.' }),
      ),
    ),
  );
  return { node, title: 'Needs speech' };
});
