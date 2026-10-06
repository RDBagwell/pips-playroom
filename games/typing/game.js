// Type with Pip: gentle keyboard and spelling practice, rebuilt from the 2020
// Typing_Game without its 10-second timer. Its word levels use the Reading
// Game's own word lists, so the two games reinforce each other.

import { el } from '../../core/dom.js';
import { createLevelMap } from '../../core/screens/level-map.js';
import { createLevelComplete } from '../../core/screens/level-complete.js';
import { section, toggle, table } from '../../core/settings-ui.js';
import { levelRecord, trickiest } from '../../core/progress.js';
import { validateTypingLevels, normalizeTypingLevels, linkReadingWords } from './levels.js';
import { fingerFor, FINGER_NAMES } from './keys.js';
import { playScreen } from './screens/play.js';
import { typingIcon } from './icon.js';

const KEY_CHARS = { space: ' ', 'full stop': '.', comma: ',', semicolon: ';' };

export const typing = {
  id: 'typing',
  title: 'Type with Pip',
  tagline: 'Find the letters and type the words!',
  practises: 'Finding letters on a real keyboard, then typing and spelling the Reading Game’s words and short sentences, with the right finger for each key.',
  color: '#9B7BE6',
  icon: typingIcon,
  data: './data/typing/levels.json',
  stylesheet: './games/typing/style.css',
  loadLevels(data) {
    const errors = validateTypingLevels(data);
    if (errors.length) throw new Error(`typing levels.json has problems:\n${errors.join('\n')}`);
    return normalizeTypingLevels(data);
  },
  link(levels, getGame) {
    const reading = getGame('reading');
    if (!reading || reading.status !== 'ready') throw new Error('Type with Pip needs the Reading Game’s words');
    return linkReadingWords(levels, reading.levels);
  },
  start: 'map',
  screens: {
    map: createLevelMap('typing', { scoresLabel: 'Best scores' }),
    play: playScreen,
    complete: createLevelComplete('typing'),
  },
  settings: {
    fingers: { type: 'boolean', default: true },
    listenAndSpell: { type: 'boolean', default: false },
    showWpm: { type: 'boolean', default: false },
    unlockAll: { type: 'boolean', default: false },
  },

  settingsSection({ settings: s, levels, commit }) {
    const levelTable = table('level-table', ['#', 'Level', 'Practises'], levels.map((l) => [
      String(l.id),
      el('span', {}, el('span', { 'aria-hidden': 'true', text: `${l.emoji} ` }), l.name),
      el('span', {}, el('strong', { text: l.focus }), l.about ? el('br') : null, l.about ? el('small', { text: l.about }) : null),
    ]));
    return section('⌨️ Type with Pip',
      toggle({ id: 'typing-fingers', label: 'Show which finger to use', hint: 'Colours the keyboard picture by finger, and names the finger for the next key.', checked: s.fingers, onChange: (v) => { s.fingers = v; commit(); } }),
      toggle({ id: 'typing-listen', label: 'Listen and spell', hint: 'On the Reading Game word levels, hide the word: Pip says it and your child spells it. Good once the words are familiar.', checked: s.listenAndSpell, onChange: (v) => { s.listenAndSpell = v; commit(); } }),
      toggle({ id: 'typing-wpm', label: 'Show words per minute', hint: 'For older children: shows their speed at the end of a level, just as information. Stars never depend on speed.', checked: s.showWpm, onChange: (v) => { s.showWpm = v; commit(); } }),
      toggle({ id: 'typing-unlock', label: 'Unlock all levels', hint: 'For children who already know their way around a keyboard.', checked: s.unlockAll, onChange: (v) => { s.unlockAll = v; commit(); } }),
      el('h3', { text: 'How to play' }),
      el('ol', { class: 'how-list' },
        el('li', { text: 'Pip says a letter, word or short sentence, and your child types it on the keyboard. Letters turn green as they’re typed.' }),
        el('li', { text: 'A wrong key is gently ignored: a soft sound, and the right key glows on the keyboard picture. Nothing typed is ever deleted, and there’s no timer.' }),
        el('li', { text: 'Stars come from how many keys were right, never from speed.' }),
        el('li', { text: 'On a phone or tablet without a keyboard, the game says so and offers a tap-the-keys practice mode. Pressing a key on an attached keyboard starts the normal game.' })),
      el('h3', { text: 'The levels' }),
      levelTable,
    );
  },

  report(progress, levels) {
    const st = progress.stats || {};
    const done = levels.filter((l) => levelRecord(progress, l.id).plays > 0);
    const keys = (st.keys || 0) + (st.wrongKeys || 0);
    const skills = [];
    if (keys) skills.push({ label: 'Right keys:', detail: `${Math.round(((st.keys || 0) / keys) * 100)}% of ${keys} key presses.` });
    if (st.bestWpm) skills.push({ label: 'Best words per minute:', detail: `${st.bestWpm} (information only).` });
    if (st.practiceLevels) skills.push({ label: 'Practice mode:', detail: `${st.practiceLevels} ${st.practiceLevels === 1 ? 'level' : 'levels'} played by tapping the screen instead of a keyboard.` });
    return {
      summary: [['Levels completed', `${done.length} of ${levels.length}`], ['Points', progress.totalScore.toLocaleString()]],
      skillsTitle: 'Typing',
      skills,
      levels: levels.map((l) => ({ name: `${l.emoji} ${l.name}`, detail: l.focus, ...levelRecord(progress, l.id) })),
      trickyTitle: 'Keys to practise',
      trickyHint: 'Keys pressed wrongly, most often first, with the finger that should press them.',
      tricky: trickiest(progress, 10).map(([key, times]) => {
        const finger = fingerFor(KEY_CHARS[key] ?? key);
        return { label: key, detail: `missed ${times} ${times === 1 ? 'time' : 'times'}${finger ? ` · ${FINGER_NAMES[finger]}` : ''}` };
      }),
    };
  },
};
