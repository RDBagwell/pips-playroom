// Number Quest: Pip is thinking of a number. The child guesses, and Pip says
// "Higher!" or "Lower!" until they find it. Rebuilt from the 2020
// Speak_Number_Guessing_Game. games/index.js adds it to the playroom.

import { el } from '../../core/dom.js';
import { createLevelMap } from '../../core/screens/level-map.js';
import { createLevelComplete } from '../../core/screens/level-complete.js';
import { section, toggle, table } from '../../core/settings-ui.js';
import { levelRecord } from '../../core/progress.js';
import { onDeviceRecognizer, onDeviceStatus, installOnDevice, STATUS_TEXT } from '../../core/recognition.js';
import { validateQuestLevels, normalizeQuestLevels } from './levels.js';
import { trickyRanges } from './logic.js';
import { playScreen } from './screens/play.js';
import { numberQuestIcon } from './icon.js';

const percent = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/**
 * The grown-ups' "Voice answers" block. The switch only appears once this
 * browser has confirmed it can recognise English speech on the device.
 *
 * Browsers without the on-device API are told apart without calling it. When
 * the API exists, it is only asked after a grown-up taps "Check this device"
 * (or voice answers were already switched on): the API is experimental, and a
 * crash in it must never take the grown-ups' corner down with it.
 */
export function voiceAnswersBlock(s, commit, win = globalThis) {
  const box = el('div', { class: 'voice-answers', 'aria-live': 'polite' });

  function render(status) {
    const parts = [el('p', { class: 'hint left voice-status', dataset: { status }, text: STATUS_TEXT[status] })];
    if (status === 'downloadable') {
      parts.push(el('button', {
        type: 'button', class: 'small-button',
        on: {
          click: async (e) => {
            e.currentTarget.disabled = true;
            e.currentTarget.textContent = 'Installing…';
            await installOnDevice(win);
            check();
          },
        },
      }, 'Install the English speech pack'));
    } else if (status === 'downloading') {
      parts.push(el('button', { type: 'button', class: 'small-button', on: { click: () => check() } }, 'Check again'));
    } else if (status === 'available') {
      parts.push(
        toggle({
          id: 'quest-voice', label: 'Let my child answer by voice',
          hint: 'Off unless you switch it on.',
          checked: s.voiceInput, onChange: (v) => { s.voiceInput = v; commit(); },
        }),
        el('p', { class: 'hint left', text: 'When this is on, a 🎤 “Say a number” button appears in Number Quest. The microphone is only used after your child taps it, and only while it says “Listening…”. Speech is understood on this device only: the browser is told it must not use an online service, and if it can’t promise that, the button stays hidden. Your browser will ask you to allow the microphone the first time.' }),
      );
    }
    // 'unsupported' and 'unavailable': no switch at all, just the explanation.
    box.replaceChildren(...parts);
    return status;
  }

  async function check() {
    box.replaceChildren(el('p', { class: 'hint left', text: 'Checking whether this device can understand speech by itself…' }));
    return render(await onDeviceStatus(win));
  }

  let ready;
  if (!onDeviceRecognizer(win)) {
    ready = Promise.resolve(render('unsupported'));
  } else if (s.voiceInput) {
    ready = check();
  } else {
    box.replaceChildren(
      el('p', { class: 'hint left', text: 'Voice answers are off. Your child can say numbers out loud instead of tapping, but only if this device can understand speech by itself, without sending it anywhere.' }),
      el('button', { type: 'button', class: 'small-button', on: { click: () => { ready = check(); } } }, 'Check this device'),
    );
    ready = Promise.resolve('unchecked');
  }
  return { node: box, get ready() { return ready; }, check };
}

export const numberQuest = {
  id: 'number-quest',
  title: 'Number Quest',
  tagline: 'Pip is thinking of a number. Can you find it?',
  practises: 'Number order and comparing (bigger, smaller), reading numerals up to 100, and the “start in the middle” halving strategy.',
  color: '#5CC689',
  icon: numberQuestIcon,
  data: './data/number-quest/levels.json',
  stylesheet: './games/number-quest/style.css',
  loadLevels(data) {
    const errors = validateQuestLevels(data);
    if (errors.length) throw new Error(`number-quest levels.json has problems:\n${errors.join('\n')}`);
    return normalizeQuestLevels(data);
  },
  start: 'map',
  screens: {
    map: createLevelMap('number-quest', { scoresLabel: 'Best scores' }),
    play: playScreen,
    complete: createLevelComplete('number-quest'),
  },
  settings: {
    hints: { type: 'boolean', default: true },
    unlockAll: { type: 'boolean', default: false },
    voiceInput: { type: 'boolean', default: false },
  },

  settingsSection({ settings: s, levels, commit }) {
    const levelTable = table('level-table', ['#', 'Level', 'Practises', 'Numbers'], levels.map((l) => [
      String(l.id),
      el('span', {}, el('span', { 'aria-hidden': 'true', text: `${l.emoji} ` }), l.name),
      el('span', {}, el('strong', { text: l.focus }), l.about ? el('br') : null, l.about ? el('small', { text: l.about }) : null),
      `${l.min}–${l.max} · ${l.rounds} to find`,
    ]));
    return section('🔢 Number Quest',
      toggle({ id: 'quest-hints', label: 'Pip’s hint button', hint: 'After a few guesses, Pip can suggest the middle of what’s left. Never required.', checked: s.hints, onChange: (v) => { s.hints = v; commit(); } }),
      toggle({ id: 'quest-unlock', label: 'Unlock all levels', hint: 'For older children who already know their numbers.', checked: s.unlockAll, onChange: (v) => { s.unlockAll = v; commit(); } }),
      el('h3', { text: 'Voice answers' }),
      voiceAnswersBlock(s, commit).node,
      el('h3', { text: 'How to play' }),
      el('ol', { class: 'how-list' },
        el('li', { text: 'Pip thinks of a number and says the range: “I’m thinking of a number from 1 to 10.”' }),
        el('li', { text: 'Your child taps a number (or types it on the number pad). Pip says “Higher!” or “Lower!”, and clouds cover the numbers that are ruled out.' }),
        el('li', { text: 'Every guess counts towards finding the number; nothing is ever taken away. Tapping a number already behind a cloud isn’t counted: Pip just repeats the clue.' }),
        el('li', { text: 'Stars compare the guesses with the fewest possible (start in the middle, halve what’s left). The thresholds are generous, and finding the number always earns a star.' }),
        el('li', { text: 'Keyboard: type a number, Enter to guess, H for Pip’s hint, R to hear Pip again.' })),
      el('h3', { text: 'The levels' }),
      levelTable,
    );
  },

  report(progress, levels) {
    const st = progress.stats || {};
    const done = levels.filter((l) => levelRecord(progress, l.id).plays > 0);
    const rounds = st.rounds || 0;
    const summary = [
      ['Levels completed', `${done.length} of ${levels.length}`],
      ['Numbers found', String(rounds)],
      ['Points', progress.totalScore.toLocaleString()],
    ];
    const skills = [];
    if (rounds) {
      const avg = (st.guesses || 0) / rounds;
      const best = (st.best || 0) / rounds;
      skills.push({
        label: 'Guesses per number:',
        detail: `${avg.toFixed(1)} on average. Starting in the middle and halving always finds the number within ${best.toFixed(1)} guesses on the levels played.`,
      });
      const split = percent(st.goodSplits || 0, st.splitChances || 0);
      skills.push({
        label: 'Starting in the middle:',
        detail: st.splitChances
          ? `${split}% of guesses were near the middle of the numbers left. ${split >= 60 ? 'They’re using the halving strategy!' : split >= 35 ? 'Sometimes; Pip’s hint shows how.' : 'Not yet; Pip’s hint shows how, and that’s fine at this age.'}`
          : 'Not enough guesses yet to tell.',
      });
      skills.push({
        label: 'Higher and lower:',
        detail: st.mixups
          ? `Tapped a number already ruled out ${st.mixups} ${st.mixups === 1 ? 'time' : 'times'} in ${rounds} numbers. The pairs below are worth comparing together.`
          : 'Always followed Pip’s clues. Great number sense!',
      });
      skills.push({ label: 'Pip’s hint:', detail: `used ${st.hints || 0} ${st.hints === 1 ? 'time' : 'times'}.` });
      skills.push({ label: 'Three-star finds:', detail: `${st.threeStars || 0} of ${rounds} numbers were found within one guess of the fewest possible.` });
    }
    return {
      summary,
      skillsTitle: 'Number skills',
      skills,
      levels: levels.map((l) => ({ name: `${l.emoji} ${l.name}`, detail: l.focus, ...levelRecord(progress, l.id) })),
      trickyTitle: 'Number ranges to practise',
      trickyHint: 'Where your child mixed up bigger and smaller: Pip had said “higher” or “lower”, and they then tapped a number on the wrong side. Comparing pairs of numbers from these ranges (“which is bigger?”) helps.',
      tricky: trickyRanges(progress.tricky).slice(0, 6).map(({ range, times, example }) => ({
        label: `Numbers ${range[0]}–${range[1]}`,
        detail: `mixed up ${times} ${times === 1 ? 'time' : 'times'}, e.g. ${example[0]} and ${example[1]}`,
      })),
    };
  },
};
