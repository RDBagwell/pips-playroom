// The Reading Game: Pip says a word, the child taps the card that matches.
// games/index.js adds it to the playroom with one registerGame() call.

import { el } from '../../core/dom.js';
import { createLevelMap } from '../../core/screens/level-map.js';
import { createLevelComplete } from '../../core/screens/level-complete.js';
import { section, toggle, table } from '../../core/settings-ui.js';
import { levelRecord, trickiest } from '../../core/progress.js';
import { validateLevels, normalizeLevels } from './levels.js';
import { formatWord } from './text.js';
import { playScreen } from './screens/play.js';
import { readingIcon } from './icon.js';

export const reading = {
  id: 'reading',
  title: 'Reading Game',
  tagline: 'Listen, look, and find the word!',
  practises: 'Early reading: hearing a word and finding it among look-alikes, following a standard phonics order from short-a words to two-syllable words, with common sight words.',
  color: '#4DB6F0',
  icon: readingIcon,
  data: './data/reading/levels.json',
  loadLevels(data) {
    const errors = validateLevels(data);
    if (errors.length) throw new Error(`levels.json has problems:\n${errors.join('\n')}`);
    return normalizeLevels(data);
  },
  start: 'map',
  screens: {
    map: createLevelMap('reading', { scoresLabel: 'Best readers' }),
    play: playScreen,
    complete: createLevelComplete('reading'),
  },
  settings: {
    wordCase: { type: 'enum', values: ['lower', 'title'], default: 'lower' },
    unlockAll: { type: 'boolean', default: false },
  },

  /** The Reading Game's part of the grown-ups' corner. */
  settingsSection({ settings: s, levels, commit }) {
    const casePreview = el('span', { class: 'case-preview' });
    const showCase = () => { casePreview.textContent = ['cat', 'I', 'ship'].map((w) => formatWord(w, s.wordCase)).join('  '); };
    const caseRadios = [['lower', 'lowercase (recommended)'], ['title', 'Title Case']].map(([value, text]) => {
      const input = el('input', { type: 'radio', name: 'word-case', value, id: `case-${value}` });
      input.checked = s.wordCase === value;
      input.addEventListener('change', () => { s.wordCase = value; commit(); showCase(); });
      return el('label', { class: 'radio', for: `case-${value}` }, input, el('span', { text }));
    });
    showCase();

    const levelTable = table('level-table', ['#', 'Level', 'Practises', 'Cards'], levels.map((l) => [
      String(l.id),
      el('span', {}, el('span', { 'aria-hidden': 'true', text: `${l.emoji} ` }), l.name),
      el('span', {}, el('strong', { text: l.focus }), l.about ? el('br') : null, l.about ? el('small', { text: l.about }) : null),
      String(l.cards),
    ]));

    return section('📖 Reading Game',
      el('fieldset', { class: 'radio-group' },
        el('legend', { class: 'setting-label', text: 'How words look' }),
        ...caseRadios,
        el('p', { class: 'hint left' }, 'Preview: ', casePreview)),
      toggle({ id: 'reading-unlock', label: 'Unlock all levels', hint: 'For older readers or a teacher picking a level.', checked: s.unlockAll, onChange: (v) => { s.unlockAll = v; commit(); } }),
      el('h3', { text: 'How to play' }),
      el('ol', { class: 'how-list' },
        el('li', { text: 'Pip the owl says a word out loud: “Find the word… cat.”' }),
        el('li', { text: 'Your child taps the card with that word. Tap 🔊 to hear it again.' }),
        el('li', { text: 'A wrong tap is never punished: the game reads the tapped word (“That word is hat”), then asks again. Missed words come back later in the level for another try.' }),
        el('li', { text: 'Find 8 words to finish a level. Stars come from how many were right on the first try, and finishing opens the next level.' }),
        el('li', { text: 'Keyboard: number keys 1–9 pick a card, R repeats the word.' })),
      el('h3', { text: 'The levels' }),
      el('p', { class: 'hint left', text: 'The levels follow a standard early-reading (phonics) order, with common sight words mixed in. Later levels also make the wrong choices trickier: first they start with different letters, then they rhyme, then they look alike.' }),
      levelTable,
    );
  },

  /** What the grown-ups' progress view shows for one reader. */
  report(progress, levels) {
    const done = levels.filter((l) => levelRecord(progress, l.id).plays > 0);
    return {
      summary: [
        ['Levels completed', `${done.length} of ${levels.length}`],
        ['Points', progress.totalScore.toLocaleString()],
      ],
      levels: levels.map((l) => ({ name: `${l.emoji} ${l.name}`, detail: l.focus, ...levelRecord(progress, l.id) })),
      trickyTitle: 'Words to practise',
      trickyHint: 'Words missed on the first try, most often first. Every missed word comes back later in the level, so these are already getting extra practice.',
      tricky: trickiest(progress, 10).map(([word, times]) => ({ label: formatWord(word), detail: `missed ${times} ${times === 1 ? 'time' : 'times'}` })),
    };
  },
};
