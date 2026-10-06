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
    ctx.speech.say(hasProfiles ? "Hi! Who's reading today?" : "Hi! Let's make your reader.");
    go(hasProfiles ? 'profiles' : 'new-profile');
  }

  const node = screen('start',
    el('div', { class: 'start-hero' },
      el('div', { class: 'mascot-slot' }, createMascot('hello').node),
      el('h1', { class: 'game-title' }, el('span', { text: 'Reading' }), ' ', el('span', { text: 'Game' })),
      el('p', { class: 'tagline', text: 'Listen, look, and find the word!' }),
      play,
    ),
  );
  return { node };
});

register('unsupported', () => {
  const node = screen('start',
    el('div', { class: 'start-hero' },
      el('div', { class: 'mascot-slot' }, createMascot('idle').node),
      el('h1', { class: 'game-title', text: 'Reading Game' }),
      el('div', { class: 'panel' },
        el('h2', { text: 'A note for grown-ups' }),
        el('p', { text: 'This game talks! It says a word out loud and your child finds it on the screen. This browser can’t speak words, so the game can’t run here.' }),
        el('p', { text: 'Please try a recent version of Safari, Chrome, Edge or Firefox. On some computers you may also need to install a text-to-speech voice.' }),
      ),
    ),
  );
  return { node, title: 'Needs speech' };
});
