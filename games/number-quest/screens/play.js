// Number Quest: one level. Pip thinks of a number; the child guesses on a
// number line of big tiles (small ranges) or a number pad (big ranges), or by
// voice if a grown-up has switched that on. Ruled-out numbers hide behind
// friendly clouds, so the line visibly narrows with every clue.

import { el } from '../../../core/dom.js';
import { go } from '../../../core/router.js';
import { ctx, activeProfile, activeProgress, gameSettings, levelsOf, save, prefersReducedMotion } from '../../../core/context.js';
import { screen, iconButton } from '../../../core/ui.js';
import { applyLevelResult, isUnlocked, noteTricky, addStat } from '../../../core/progress.js';
import { levelBonus } from '../../../core/scoring.js';
import { createMascot } from '../../../core/mascot.js';
import { confetti, flyPoints } from '../../../core/effects.js';
import { onDeviceStatus, createListener } from '../../../core/recognition.js';
import {
  createQuest, guess, pickNumber, hintReady, useHint, optimalGuesses, roundStars, levelStars,
  pointsForRound, mixupKey, startPhrases, resultPhrases, hintPhrases,
} from '../logic.js';
import { bestSpokenNumber } from '../numbers.js';

const GAME = 'number-quest';
const MIN_CELEBRATE_MS = 1200;
const TYPE_PAUSE_MS = 1300;

/** Dots for small numbers: one row of 5, or a ten-frame (two rows of 5). */
export function dotPicture(n, max) {
  const frame = max <= 5 ? 5 : 10;
  return el('span', { class: `dots dots-${frame}`, 'aria-hidden': 'true' },
    ...Array.from({ length: frame }, (_, i) => el('span', { class: i < n ? 'dot-on' : 'dot-off' })));
}

export function playScreen({ levelId }) {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  const progress = activeProgress(GAME);
  const levels = levelsOf(GAME);
  const level = levels.find((l) => l.id === levelId);
  const s = gameSettings(GAME);
  if (!level || !isUnlocked(progress, level.id, { unlockAll: s.unlockAll })) return { redirect: `${GAME}/map` };

  const { speech } = ctx;
  const { min, max } = level;
  const size = max - min + 1;
  const digits = String(max).length;
  let quest = null;
  let roundNo = 0;
  let score = 0;
  let totalGuesses = 0;
  const starsPerRound = [];
  const recent = [];
  let entry = '';
  let lastLines = [];
  let locked = true;
  let destroyed = false;
  const timers = new Set();
  let typeTimer = null;

  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!destroyed) fn();
    }, ms);
    timers.add(t);
    return t;
  };
  const wait = (ms) => new Promise((resolve) => later(resolve, ms));

  // ----- DOM -----
  const scoreValue = el('span', { class: 'score-value', text: '0' });
  const scoreBox = el('div', { class: 'score-box', 'aria-label': 'Score' },
    el('span', { class: 'coin', 'aria-hidden': 'true', text: '🪙' }), scoreValue);
  const dots = Array.from({ length: level.rounds }, () => el('span', { class: 'dot', 'aria-hidden': 'true' }));
  const progressBar = el('div', {
    class: 'progress', role: 'progressbar', 'aria-label': 'Numbers found',
    'aria-valuemin': 0, 'aria-valuemax': level.rounds, 'aria-valuenow': 0,
  }, ...dots);

  const bubble = el('p', { class: 'speech-bubble quest-bubble', 'aria-hidden': 'true' });
  const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  const mascot = createMascot('idle');

  // The number line: clouds cover the ruled-out ends; flags mark guesses.
  const cloudLeft = el('span', { class: 'track-cloud track-cloud-left' });
  const cloudRight = el('span', { class: 'track-cloud track-cloud-right' });
  const flags = el('span', { class: 'track-flags' });
  const track = el('div', { class: 'track', role: 'img' },
    el('span', { class: 'track-line' }),
    flags, cloudLeft, cloudRight,
    el('span', { class: 'track-end track-min', 'aria-hidden': 'true', text: String(min) }),
    el('span', { class: 'track-end track-max', 'aria-hidden': 'true', text: String(max) }));
  const rangeLabel = el('p', { class: 'range-label', 'aria-hidden': 'true' });

  // Small ranges: a tappable number line of big tiles.
  const tiles = level.pad ? [] : Array.from({ length: size }, (_, i) => {
    const n = min + i;
    return el('button', {
      type: 'button', class: 'num-tile', dataset: { n: String(n) }, 'aria-label': String(n),
      on: { click: () => submit(n) },
    },
    el('span', { class: 'num-tile-numeral', 'aria-hidden': 'true', text: String(n) }),
    level.dots ? dotPicture(n, max) : null);
  });
  const tileGrid = level.pad ? null : el('div', { class: `num-tiles${level.dots ? ' with-dots' : ''}`, role: 'group', 'aria-label': `Numbers ${min} to ${max}`, dataset: { count: String(size) } }, ...tiles);

  // Big ranges (and the keyboard): type a number, then Guess.
  const entryOut = el('output', { class: 'pad-display', 'aria-live': 'polite', 'aria-label': 'Your number' });
  const padKey = (label, onClick, extra = {}) => el('button', { type: 'button', class: `pad-key ${extra.class || ''}`.trim(), 'aria-label': extra.label || label, on: { click: onClick } }, label);
  const pad = level.pad
    ? el('div', { class: 'pad', role: 'group', 'aria-label': 'Number pad' },
      entryOut,
      el('div', { class: 'pad-keys' },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => padKey(String(d), () => typeDigit(String(d)))),
        padKey('⌫', backspace, { class: 'pad-back', label: 'Delete' }),
        padKey('0', () => typeDigit('0')),
        padKey('✓', () => submitEntry(), { class: 'pad-go', label: 'Guess' })))
    : null;
  const typed = level.pad ? null : el('p', { class: 'quest-typed', 'aria-live': 'polite' });

  const hintButton = el('button', { type: 'button', class: 'big-button secondary hint-button', hidden: true, 'aria-keyshortcuts': 'H', on: { click: showHint } },
    el('span', { 'aria-hidden': 'true', text: '💡 ' }), 'Pip’s hint');
  const hear = el('button', { type: 'button', class: 'hear-button', 'aria-keyshortcuts': 'R', on: { click: repeat } },
    el('span', { class: 'hear-icon', 'aria-hidden': 'true', text: '🔊' }), el('span', { class: 'hear-label', text: 'Hear it again' }));
  const micLabel = el('span', { class: 'mic-label', text: 'Say a number' });
  const mic = el('button', { type: 'button', class: 'mic-button', hidden: true, 'aria-pressed': 'false', on: { click: toggleMic } },
    el('span', { class: 'mic-icon', 'aria-hidden': 'true', text: '🎤' }), micLabel);

  const node = screen('quest',
    el('header', { class: 'topbar play-topbar' },
      iconButton({ icon: '🗺️', label: 'Back to the map', onClick: () => go(`${GAME}/map`) }),
      el('h1', { class: 'topbar-title' },
        el('span', { class: 'level-badge', style: { '--stone-color': level.color }, text: level.id }),
        el('span', { class: 'level-name', text: level.name })),
      el('div', { class: 'topbar-actions' }, scoreBox)),
    progressBar,
    el('div', { class: 'quest-area' },
      el('aside', { class: 'helper quest-helper' }, el('div', { class: 'mascot-slot' }, mascot.node), bubble),
      el('div', { class: 'quest-board' },
        track, rangeLabel,
        tileGrid, typed, pad,
        el('div', { class: 'quest-actions' }, hear, mic, hintButton))),
    status);

  // ----- talking -----
  function say(lines) {
    lastLines = lines;
    bubble.textContent = lines.join(' ');
    status.textContent = lines.join(' ');
    return speech.say(lines);
  }

  function repeat() {
    ctx.sfx?.play('tap');
    speech.say(lastLines);
  }

  // ----- drawing the line -----
  function render() {
    const { low, high } = quest;
    const pct = (k) => `${(k / size) * 100}%`;
    cloudLeft.style.setProperty('width', pct(low - min));
    cloudRight.style.setProperty('width', pct(max - high));
    cloudLeft.classList.toggle('cloud-empty', low === min);
    cloudRight.classList.toggle('cloud-empty', high === max);
    const markers = quest.guesses.map((g) => el('span', {
      class: `track-flag${g === quest.target && quest.found ? ' found' : ''}`,
      style: { left: `${((g - min + 0.5) / size) * 100}%` },
      'aria-hidden': 'true',
      text: String(g),
    }));
    flags.replaceChildren(...markers);
    const sayRange = quest.found
      ? `Found it! The number was ${quest.target}.`
      : low === high ? `It must be ${low}!` : `It’s between ${low} and ${high}.`;
    track.setAttribute('aria-label', `Number line from ${min} to ${max}. ${sayRange}`);
    rangeLabel.textContent = sayRange;
    for (const t of tiles) {
      const n = Number(t.dataset.n);
      const out = n < low || n > high;
      t.classList.toggle('cloud', out);
      t.classList.toggle('guessed', quest.guesses.includes(n));
      t.classList.toggle('found', quest.found && n === quest.target);
      t.classList.remove('hinted');
      t.disabled = out && !(quest.found && n === quest.target);
      t.setAttribute('aria-label', out ? `${n}, hidden by a cloud` : String(n));
    }
    hintButton.hidden = !(s.hints && hintReady(quest, level.hintAfter));
  }

  function showEntry() {
    if (pad) entryOut.textContent = entry || ' ';
    if (typed) typed.textContent = entry ? `${entry}…` : '';
  }

  // ----- typing (number pad, or the keyboard on any level) -----
  function typeDigit(d) {
    if (locked) return;
    clearTimeout(typeTimer);
    if (entry.length >= digits) entry = '';
    entry = entry === '0' ? d : entry + d;
    ctx.sfx?.play('tap');
    showEntry();
    if (pad) return; // the pad has its own Guess button
    // On tiles, guess as soon as no bigger number could follow; else after a pause.
    if (Number(entry) * 10 > max || entry.length >= digits) submitEntry();
    else typeTimer = later(submitEntry, TYPE_PAUSE_MS);
  }

  function backspace() {
    clearTimeout(typeTimer);
    entry = entry.slice(0, -1);
    showEntry();
  }

  function submitEntry() {
    clearTimeout(typeTimer);
    if (!entry) {
      if (pad) say([`Type a number from ${min} to ${max}, then press the tick.`]);
      return;
    }
    const n = Number(entry);
    entry = '';
    showEntry();
    submit(n);
  }

  // ----- a guess -----
  async function submit(n) {
    if (locked || destroyed) return;
    const result = guess(quest, n);
    if (result.kind === 'invalid' || result.kind === 'out-of-range') {
      ctx.sfx?.play('soft');
      say([`Pick a number from ${min} to ${max}.`]);
      return;
    }
    if (result.kind === 'done') return;
    if (result.kind === 'ruled-out') {
      ctx.sfx?.play('soft');
      mascot.nod();
      say(resultPhrases(n, result));
      return;
    }
    totalGuesses += 1;
    render();
    if (result.kind !== 'found') {
      ctx.sfx?.play('tap');
      mascot.nod();
      say(resultPhrases(n, result));
      return;
    }

    // Found it!
    locked = true;
    const stars = roundStars(result.guesses, size);
    const points = pointsForRound(stars);
    starsPerRound.push(stars);
    score += points;
    recordRound(stars);
    ctx.sfx?.play('correct');
    mascot.cheer();
    const target = tiles.find((t) => Number(t.dataset.n) === n) || (pad || track);
    confetti(target);
    flyPoints(target, scoreBox, `+${points}`);
    later(() => {
      scoreValue.textContent = score.toLocaleString();
      progressBar.setAttribute('aria-valuenow', String(starsPerRound.length));
      dots.forEach((d, i) => d.classList.toggle('on', i < starsPerRound.length));
    }, 600);
    await Promise.all([say(resultPhrases(n, result)), wait(MIN_CELEBRATE_MS)]);
    if (destroyed) return;
    if (starsPerRound.length >= level.rounds) finish();
    else startRound();
  }

  /** Remember what this round shows about the child's number sense (for grown-ups). */
  function recordRound(stars) {
    addStat(progress, 'rounds');
    addStat(progress, 'guesses', quest.guesses.length);
    addStat(progress, 'best', optimalGuesses(size));
    addStat(progress, 'splitChances', quest.splitChances);
    addStat(progress, 'goodSplits', quest.goodSplits);
    addStat(progress, 'hints', quest.hintsUsed);
    addStat(progress, 'mixups', quest.mixups.length);
    if (stars === 3) addStat(progress, 'threeStars');
    quest.mixups.forEach((m) => noteTricky(progress, mixupKey(m)));
    save();
  }

  function showHint() {
    if (locked || !quest || quest.found) return;
    const hint = useHint(quest);
    ctx.sfx?.play('tap');
    const tile = tiles.find((t) => Number(t.dataset.n) === hint.middle);
    if (tile) {
      tile.classList.add('hinted');
      tile.focus();
    }
    say(hintPhrases(hint));
  }

  // ----- voice answers (on-device only; see core/recognition.js) -----
  const listener = createListener(window, {
    onResult(alternatives) {
      const n = bestSpokenNumber(alternatives, { min, max });
      if (n === null) {
        say(['Hmm, I didn’t catch a number.', 'Can you say it again?']);
        return;
      }
      submit(n);
    },
    onState(state, detail) {
      const on = state === 'listening';
      mic.classList.toggle('listening', on);
      mic.setAttribute('aria-pressed', String(on));
      micLabel.textContent = on ? 'Listening…' : 'Say a number';
      if (on) status.textContent = 'Listening. Say a number.';
      if (state === 'error') {
        if (detail === 'not-allowed' || detail === 'service-not-allowed') {
          bubble.textContent = 'The microphone isn’t switched on for this page. A grown-up can allow it in the browser.';
        } else if (detail === 'no-speech') {
          say(['I didn’t hear anything.', 'Tap the microphone and try again!']);
        } else if (detail === 'language-not-supported' || detail === 'not-on-device' || detail === 'unsupported') {
          mic.hidden = true; // never fall back to a server
        }
      }
    },
  });

  function toggleMic() {
    if (locked && !listener.listening) return;
    if (listener.listening) {
      listener.stop();
      return;
    }
    speech.stop(); // so the microphone doesn't pick up Pip's voice
    listener.start();
  }

  if (s.voiceInput) {
    onDeviceStatus(window).then((st) => {
      if (!destroyed && st === 'available') mic.hidden = false;
    });
  }

  // ----- flow -----
  function startRound() {
    roundNo += 1;
    const target = pickNumber(min, max, { recent: recent.slice(-2) });
    recent.push(target);
    quest = createQuest({ min, max, target });
    entry = '';
    showEntry();
    render();
    locked = false;
    const lines = startPhrases(level);
    say(roundNo === 1 ? lines : ['Here’s a new number!', ...lines]);
  }

  function finish() {
    const stars = levelStars(starsPerRound);
    const bonus = levelBonus(stars);
    const total = score + bonus;
    const outcome = applyLevelResult(progress, level, { score: total, stars }, levels.length);
    save();
    go(`${GAME}/complete`, {
      levelId: level.id, stars, bonus, base: score, score: total, outcome,
      tally: [['Numbers found', level.rounds], ['Guesses', totalGuesses]],
    });
  }

  // ----- keyboard: digits type a number, Enter guesses, H hint, R repeat -----
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      typeDigit(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (e.key === 'Enter' && entry) {
      e.preventDefault();
      submitEntry();
    } else if (e.key === 'h' || e.key === 'H') {
      if (!hintButton.hidden) showHint();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      repeat();
    }
  }
  document.addEventListener('keydown', onKey);

  later(startRound, prefersReducedMotion() ? 50 : 350);

  return {
    node,
    title: level.name,
    focus: hear,
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      clearTimeout(typeTimer);
      listener.stop();
      document.removeEventListener('keydown', onKey);
      speech.stop();
    },
  };
}
