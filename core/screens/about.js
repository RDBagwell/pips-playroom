// "About these games": what each game practises and how the playroom keeps
// children safe, in plain language for parents and teachers.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { screen, topbar } from '../ui.js';
import { allGames } from '../registry.js';
import { STICKERS } from '../stickers.js';
import { defaultBack } from './gate.js';

const PRINCIPLES = [
  ['Nothing leaves this device.', 'There are no accounts, ads, analytics or trackers, and the playroom loads nothing from anywhere but its own website. Names, stars and settings are kept in this browser only. Nothing is ever uploaded.'],
  ['Pip’s voice stays on the device too, when it can.', 'Pip speaks with the voices built into your device. Some browsers also offer online voices, which send the words to a server to be spoken, so the playroom always picks a voice on this device first, and tells you in settings if it can’t.'],
  ['Voice answers are on-device only.', 'In Number Quest a child can say numbers out loud, but only if you switch it on, and only where the browser can understand speech on the device itself. The playroom never uses online speech recognition, and the microphone is only used after your child taps 🎤.'],
  ['Mistakes are part of learning.', 'Nothing is ever taken away. A wrong answer gets a gentle wobble and an explanation (“That word is hat”, “Let’s count: 1, 2, 3…”), and the question comes back later. There’s no “game over”.'],
  ['No pressure, no tricks.', 'No countdowns (the optional “beat your own time” only counts up), no daily rewards, no streaks to lose, no random prizes and nothing limited-time. Stickers unlock at fixed star counts you can always see.'],
  ['Made for small hands.', 'Big buttons (at least 64 pixels), everything works with a keyboard, and animations calm down if your device asks for reduced motion.'],
];

register('about', ({ back = defaultBack() } = {}) => {
  const node = screen('about',
    topbar({ title: 'About these games', back: () => go(back.name, back.params), backLabel: 'Back to settings' }),
    el('div', { class: 'settings-grid about' },
      el('section', { class: 'panel settings-section' },
        el('h2', { text: 'What your child practises' }),
        el('ul', { class: 'about-games' }, ...allGames().map((g) => el('li', { class: 'about-game' },
          el('span', { class: 'progress-game-icon', 'aria-hidden': 'true' }, g.icon()),
          el('span', {}, el('strong', { text: g.title }), el('span', { text: ` ${g.practises || g.tagline}` }))))),
        el('p', { class: 'hint left', text: `Stars from every game add up in the sticker book: ${STICKERS.length} stickers to collect and arrange on three pages.` })),
      el('section', { class: 'panel settings-section' },
        el('h2', { text: 'How the playroom keeps children safe' }),
        el('dl', { class: 'about-principles' }, ...PRINCIPLES.flatMap(([t, d]) => [el('dt', { text: t }), el('dd', { text: d })]))),
      el('section', { class: 'panel settings-section' },
        el('h2', { text: 'For teachers' }),
        el('p', { text: 'Each game’s levels follow a standard early-years order, and every level is listed with what it practises in the grown-ups’ corner. “Unlock all levels” lets you start a child at the right place, and each reader’s Progress page shows the words, numbers, facts and keys they find tricky. Nothing is shared: to talk about a child’s progress, look at it together on the device.' })),
    ));
  return { node, title: 'About' };
});
