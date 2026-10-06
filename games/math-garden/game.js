// Math Garden: is this right? Rebuilt from the 2020 Math_Sprint_Game, without
// the pressure: no countdown, no time penalties. games/index.js registers it.

import { el } from '../../core/dom.js';
import { createLevelMap } from '../../core/screens/level-map.js';
import { createLevelComplete } from '../../core/screens/level-complete.js';
import { section, toggle, table } from '../../core/settings-ui.js';
import { levelRecord, trickiest } from '../../core/progress.js';
import { validateMathLevels, normalizeMathLevels } from './levels.js';
import { familyLabel } from './questions.js';
import { playScreen, formatTime } from './screens/play.js';
import { mathGardenIcon } from './icon.js';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const mathGarden = {
  id: 'math-garden',
  title: 'Math Garden',
  tagline: 'Count, add and check: is it right?',
  practises: 'Counting, adding and taking away, doubles, making 10, adding tens and the 2, 5 and 10 times tables, with countable pictures that fade as children get confident.',
  color: '#FFB84D',
  icon: mathGardenIcon,
  data: './data/math-garden/levels.json',
  stylesheet: './games/math-garden/style.css',
  loadLevels(data) {
    const errors = validateMathLevels(data);
    if (errors.length) throw new Error(`math-garden levels.json has problems:\n${errors.join('\n')}`);
    return normalizeMathLevels(data);
  },
  start: 'map',
  screens: {
    map: createLevelMap('math-garden', { scoresLabel: 'Best scores' }),
    play: playScreen,
    complete: createLevelComplete('math-garden'),
  },
  settings: {
    pictures: { type: 'enum', values: ['level', 'always'], default: 'level' },
    sprint: { type: 'boolean', default: false },
    unlockAll: { type: 'boolean', default: false },
  },

  settingsSection({ settings: s, levels, commit }) {
    const levelTable = table('level-table', ['#', 'Level', 'Practises', 'Pictures'], levels.map((l) => [
      String(l.id),
      el('span', {}, el('span', { 'aria-hidden': 'true', text: `${l.emoji} ` }), l.name),
      el('span', {}, el('strong', { text: l.focus }), l.about ? el('br') : null, l.about ? el('small', { text: l.about }) : null),
      { always: 'Always', help: 'When asked', none: 'After a wrong tap' }[l.pictures],
    ]));
    return section('🌻 Math Garden',
      toggle({ id: 'math-pictures', label: 'Always show pictures', hint: 'Keep the countable pictures on every level, for children who still like to count.', checked: s.pictures === 'always', onChange: (v) => { s.pictures = v ? 'always' : 'level'; commit(); } }),
      toggle({ id: 'math-sprint', label: 'Beat your own time', hint: 'A stopwatch counts up while your child plays, and the end of the level shows their time and their best. It never counts down and never takes points away. Off by default: most young children do better without a clock.', checked: s.sprint, onChange: (v) => { s.sprint = v; commit(); } }),
      toggle({ id: 'math-unlock', label: 'Unlock all levels', hint: 'For older children who already know the early facts.', checked: s.unlockAll, onChange: (v) => { s.unlockAll = v; commit(); } }),
      el('h3', { text: 'How to play' }),
      el('ol', { class: 'how-list' },
        el('li', { text: 'Pip asks a question out loud, reading the numbers as words: “What is four plus three?”' }),
        el('li', { text: 'Some questions are “Is this right?”: your child taps ✔ Right or ✘ Not right. Checking an answer is a skill too.' }),
        el('li', { text: 'A wrong tap is never punished: the answer wobbles and Pip explains, counting along with the picture. Missed questions come back later in the level.' }),
        el('li', { text: 'Stars come from how many were right on the first try. There is no timer unless you switch on “Beat your own time”.' }),
        el('li', { text: 'Keyboard: 1–4 pick an answer, Y or N for right or not right, R to hear Pip again.' })),
      el('h3', { text: 'The levels' }),
      levelTable,
    );
  },

  report(progress, levels) {
    const st = progress.stats || {};
    const done = levels.filter((l) => levelRecord(progress, l.id).plays > 0);
    const skills = [];
    if (st.questions) {
      skills.push({ label: 'First-try answers:', detail: `${pct(st.firstTry || 0, st.questions)}% of ${st.questions} questions.` });
    }
    const times = levels.filter((l) => st[`time${l.id}`]).map((l) => `${l.name} ${formatTime(st[`time${l.id}`])}`);
    if (times.length) skills.push({ label: 'Best times (beat your own time):', detail: times.join(', ') });
    return {
      summary: [['Levels completed', `${done.length} of ${levels.length}`], ['Points', progress.totalScore.toLocaleString()]],
      skillsTitle: 'Maths',
      skills,
      levels: levels.map((l) => ({ name: `${l.emoji} ${l.name}`, detail: l.focus, ...levelRecord(progress, l.id) })),
      trickyTitle: 'Fact families to practise',
      trickyHint: 'Facts missed on the first try, grouped into families: 3 + 4, 4 + 3, 7 − 3 and 7 − 4 are one family. Practising one helps with the others.',
      tricky: trickiest(progress, 10).map(([key, times]) => ({ label: familyLabel(key), detail: `missed ${times} ${times === 1 ? 'time' : 'times'}` })),
    };
  },
};
