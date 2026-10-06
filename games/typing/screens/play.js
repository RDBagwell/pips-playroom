// Type with Pip: one level. Pip says a letter, word or sentence; the child
// types it on a real keyboard. Correct letters turn green. A wrong key is
// gently ignored: a soft sound, and the right key glows on the keyboard
// picture. Nothing typed is ever deleted, and there is no timer.

import { el } from '../../../core/dom.js';
import { go } from '../../../core/router.js';
import { ctx, activeProfile, activeProgress, gameSettings, levelsOf, save, prefersReducedMotion } from '../../../core/context.js';
import { screen, iconButton } from '../../../core/ui.js';
import { applyLevelResult, isUnlocked, noteTricky, addStat } from '../../../core/progress.js';
import { levelBonus } from '../../../core/scoring.js';
import { createMascot } from '../../../core/mascot.js';
import { confetti, flyPoints } from '../../../core/effects.js';
import { HALVES, fingerFor, FINGER_NAMES, keyName, spokenKey, typedChar, capsLockOn } from '../keys.js';
import { createTyping, nextChar, typeChar, typingStars, accuracy, wordsPerMinute, pickItems } from '../session.js';
import { itemsOf } from '../levels.js';
import { needsKeyboardCard, pointerFacts, noteKeyPress, hasSeenKeyPress } from '../detect.js';

const GAME = 'typing';
const MIN_CELEBRATE_MS = 900;
const PRAISE = ['Great typing!', 'You did it!', 'Super typing!', 'Well done!', 'Wonderful!', 'Nice work!'];

/**
 * The keyboard picture: two halves (one per hand), side by side on wide
 * screens and stacked on narrow ones. Interactive keys (practice mode) are
 * big buttons; otherwise it's a picture for guidance only.
 */
export function buildKeyboard({ interactive = false, fingers = true, onKey = () => {} } = {}) {
  const keys = new Map();
  const makeKey = (char) => {
    const label = char === ' ' ? 'space' : char;
    const attrs = {
      class: `kb-key${char === ' ' ? ' kb-space' : ''}`,
      dataset: { key: char, finger: fingers ? fingerFor(char) : '' },
    };
    const k = interactive
      ? el('button', { ...attrs, type: 'button', 'aria-label': keyName(char), on: { click: () => onKey(char) } }, label)
      : el('span', attrs, label);
    keys.set(char, k);
    return k;
  };
  const half = (rows, side) => el('div', { class: `kb-half kb-${side}` }, ...rows.map((r) => el('div', { class: 'kb-row' }, ...r.map(makeKey))));
  const node = el('div', {
    class: `keyboard${interactive ? ' interactive' : ''}${fingers ? ' fingers' : ''}`,
    role: interactive ? 'group' : 'img',
    'aria-label': interactive ? 'Keyboard: tap the keys' : 'Keyboard picture',
  },
  el('div', { class: 'kb-halves' }, half(HALVES[0], 'left'), half(HALVES[1], 'right')),
  el('div', { class: 'kb-row kb-row-space' }, makeKey(' ')));
  return {
    node,
    highlight(char) {
      keys.forEach((k) => k.classList.remove('next', 'nudge'));
      const k = char ? keys.get(char.toLowerCase()) : null;
      if (k) k.classList.add('next');
    },
    nudge(char) {
      const k = keys.get(String(char).toLowerCase());
      if (!k) return;
      k.classList.remove('nudge');
      void k.offsetWidth; // restart the glow
      k.classList.add('nudge');
    },
  };
}

export function promptFor(level, text, hidden) {
  if (level.kind === 'letters') return [`Find the letter ${spokenKey(text)}!`];
  if (level.kind === 'sentences') return ['Type this:', text];
  return [hidden ? 'Listen and spell:' : 'Type the word:', text];
}

export function playScreen({ levelId, practice = false }) {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  const playerProgress = activeProgress(GAME);
  const levels = levelsOf(GAME);
  const level = levels.find((l) => l.id === levelId);
  const s = gameSettings(GAME);
  if (!level || !isUnlocked(playerProgress, level.id, { unlockAll: s.unlockAll })) return { redirect: `${GAME}/map` };

  const { speech } = ctx;
  const hidden = level.canHide && s.listenAndSpell;
  const items = pickItems(itemsOf(level), level.goal);
  let itemNo = -1;
  let t = null;
  let correct = 0;
  let wrong = 0;
  let wrongInARow = 0;
  let score = 0;
  let typingMs = 0;
  let itemStart = null;
  const misses = {};
  let locked = true;
  let destroyed = false;
  let lastLines = [];
  let lastPraise = null;
  let mode = practice ? 'practice' : (needsKeyboardCard({ ...pointerFacts(window), sawKey: hasSeenKeyPress() }) ? 'card' : 'keyboard');
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!destroyed) fn();
    }, ms);
    timers.add(id);
  };
  const wait = (ms) => new Promise((resolve) => later(resolve, ms));

  // ----- DOM -----
  const scoreValue = el('span', { class: 'score-value', text: '0' });
  const scoreBox = el('div', { class: 'score-box', 'aria-label': 'Score' },
    el('span', { class: 'coin', 'aria-hidden': 'true', text: '🪙' }), scoreValue);
  const dots = Array.from({ length: level.goal }, () => el('span', { class: 'dot', 'aria-hidden': 'true' }));
  const progress = el('div', {
    class: 'progress', role: 'progressbar', 'aria-label': 'Typed so far',
    'aria-valuemin': 0, 'aria-valuemax': level.goal, 'aria-valuenow': 0,
  }, ...dots);
  const target = el('p', { class: `type-target type-${level.kind}`, tabindex: '-1', 'aria-live': 'polite' });
  const fingerHint = el('p', { class: 'finger-hint', 'aria-live': 'polite' });
  const capsNote = el('p', { class: 'caps-note', hidden: true, text: 'Caps Lock is on. That’s OK: big or small letters both count.' });
  const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  const mascot = createMascot('idle');
  const hear = el('button', { type: 'button', class: 'hear-button', on: { click: repeat } },
    el('span', { class: 'hear-icon', 'aria-hidden': 'true', text: '🔊' }), el('span', { class: 'hear-label', text: 'Hear it again' }));
  let keyboard = buildKeyboard({ interactive: mode === 'practice', fingers: s.fingers, onKey: (c) => handleChar(c) });
  const keyboardSlot = el('div', { class: 'keyboard-slot' }, keyboard.node);
  const practiceBadge = el('p', { class: 'practice-badge', hidden: mode !== 'practice', text: '👆 Practice mode: tap the keys' });

  const card = el('div', { class: 'panel keyboard-card', hidden: mode !== 'card' },
    el('p', { class: 'keyboard-card-icon', 'aria-hidden': 'true', text: '⌨️' }),
    el('h2', { text: 'This game needs a keyboard' }),
    el('p', { text: 'Type with Pip is for practising on a real keyboard. If one is plugged in, press any key to start!' }),
    el('button', { type: 'button', class: 'big-button', on: { click: startPractice } },
      el('span', { 'aria-hidden': 'true', text: '👆 ' }), 'Tap the keys instead'),
    el('p', { class: 'hint', text: 'Tapping is practice mode: it’s good for finding letters, but it isn’t the same as typing.' }));

  const game = el('div', { class: 'type-area', hidden: mode === 'card' },
    el('aside', { class: 'helper' }, el('div', { class: 'mascot-slot' }, mascot.node), hear),
    el('div', { class: 'type-board' }, practiceBadge, target, fingerHint, capsNote, keyboardSlot));

  const node = screen('typing',
    el('header', { class: 'topbar play-topbar' },
      iconButton({ icon: '🗺️', label: 'Back to the map', onClick: () => go(`${GAME}/map`) }),
      el('h1', { class: 'topbar-title' },
        el('span', { class: 'level-badge', style: { '--stone-color': level.color }, text: level.id }),
        el('span', { class: 'level-name', text: level.name })),
      el('div', { class: 'topbar-actions' }, scoreBox)),
    progress, card, game, status);

  // ----- talking -----
  function say(lines) {
    lastLines = lines;
    return speech.say(lines);
  }
  function repeat() {
    ctx.sfx?.play('tap');
    speech.say(lastLines);
    target.focus({ preventScroll: true });
  }

  // ----- drawing -----
  function render() {
    const chars = [...t.text].map((c, i) => {
      const state = i < t.index ? 'typed' : i === t.index ? 'current' : 'todo';
      const show = state === 'typed' || !hidden ? (c === ' ' ? ' ' : c) : (c === ' ' ? ' ' : '_');
      return el('span', { class: `ch ${state}${c === ' ' ? ' space' : ''}`, 'aria-hidden': 'true', text: show });
    });
    target.replaceChildren(...chars);
    target.setAttribute('aria-label', hidden ? `Spell the word you heard. ${t.index} of ${t.text.length} letters typed.` : `Type: ${t.text}. ${t.index} of ${t.text.length} typed.`);
    const next = nextChar(t);
    keyboard.highlight(next);
    const finger = next ? fingerFor(next) : null;
    fingerHint.textContent = s.fingers && finger ? `Use your ${FINGER_NAMES[finger]}` : '';
    fingerHint.dataset.finger = s.fingers && finger ? finger : '';
  }

  function updateScore() {
    scoreValue.textContent = score.toLocaleString();
    progress.setAttribute('aria-valuenow', String(itemNo + 1));
    dots.forEach((d, i) => d.classList.toggle('on', i <= itemNo));
  }

  // ----- flow -----
  function nextItem() {
    itemNo += 1;
    t = createTyping(items[itemNo]);
    itemStart = null;
    wrongInARow = 0;
    render();
    locked = false;
    say(promptFor(level, t.text, hidden));
  }

  async function handleChar(char) {
    if (locked || destroyed || mode === 'card') return;
    const now = performance.now();
    if (itemStart === null) itemStart = now;
    const expected = nextChar(t);
    const result = typeChar(t, char);
    if (result === 'ignored') return;
    if (result === 'wrong') {
      wrong += 1;
      wrongInARow += 1;
      misses[expected] = (misses[expected] || 0) + 1;
      ctx.sfx?.play('soft');
      keyboard.nudge(expected);
      target.classList.remove('bump');
      void target.offsetWidth;
      target.classList.add('bump');
      status.textContent = `Look for ${keyName(expected)}.`;
      if (wrongInARow === 3) {
        const finger = fingerFor(expected);
        say([`Look for the glowing key: ${spokenKey(expected)}.`, s.fingers && finger ? `Use your ${FINGER_NAMES[finger]}.` : ''].filter(Boolean));
      }
      return;
    }
    correct += 1;
    wrongInARow = 0;
    render();
    if (result !== 'done') return;

    // The whole letter, word or sentence is typed.
    locked = true;
    typingMs += now - itemStart;
    score += t.correct;
    ctx.sfx?.play('correct');
    mascot.cheer();
    confetti(target);
    flyPoints(target, scoreBox, `+${t.correct}`);
    later(updateScore, 600);
    lastPraise = PRAISE.filter((p) => p !== lastPraise)[Math.floor(Math.random() * (PRAISE.length - 1))];
    await Promise.all([say([lastPraise]), wait(MIN_CELEBRATE_MS)]);
    if (destroyed) return;
    if (itemNo + 1 >= items.length) finish();
    else nextItem();
  }

  function finish() {
    const stars = typingStars(correct, wrong);
    const bonus = levelBonus(stars);
    const total = score + bonus;
    const outcome = applyLevelResult(playerProgress, level, { score: total, stars }, levels.length);
    for (const [char, n] of Object.entries(misses)) for (let i = 0; i < n; i += 1) noteTricky(playerProgress, keyName(char));
    addStat(playerProgress, 'keys', correct);
    addStat(playerProgress, 'wrongKeys', wrong);
    if (mode === 'practice') addStat(playerProgress, 'practiceLevels');
    const typedChars = items.reduce((n, x) => n + x.length, 0);
    const wpm = wordsPerMinute(typedChars, typingMs);
    if (s.showWpm && mode !== 'practice' && wpm > (playerProgress.stats.bestWpm || 0)) playerProgress.stats.bestWpm = wpm;
    save();
    const kindWord = { letters: 'Letters found', words: 'Words typed', sentences: 'Sentences typed' }[level.kind];
    const tally = [[kindWord, items.length], ['Right keys', `${Math.round(accuracy(correct, wrong) * 100)}%`]];
    if (s.showWpm && mode !== 'practice') tally.push(['Words per minute', wpm]);
    go(`${GAME}/complete`, { levelId: level.id, stars, bonus, base: score, score: total, outcome, tally });
  }

  function startPractice() {
    mode = 'practice';
    keyboard = buildKeyboard({ interactive: true, fingers: s.fingers, onKey: (c) => handleChar(c) });
    keyboardSlot.replaceChildren(keyboard.node);
    card.hidden = true;
    game.hidden = false;
    practiceBadge.hidden = false;
    ctx.sfx?.play('tap');
    begin();
  }

  let begun = false;
  function begin() {
    if (begun) return;
    begun = true;
    later(nextItem, prefersReducedMotion() ? 50 : 350);
  }

  // ----- the real keyboard -----
  function onKey(e) {
    if (e.ctrlKey || e.metaKey) return;
    const char = typedChar(e);
    // Keep the page from scrolling on space, and buttons from being pressed by it.
    if (char !== null || e.key === 'Backspace') e.preventDefault();
    if (e.repeat) return;
    capsNote.hidden = !capsLockOn(e);
    if (mode === 'card' || mode === 'practice') {
      // A real key press means there is a keyboard after all.
      noteKeyPress();
      if (mode === 'card') {
        mode = 'keyboard';
        card.hidden = true;
        game.hidden = false;
        begin();
        return;
      }
    } else {
      noteKeyPress();
    }
    if (char !== null) handleChar(char);
  }
  document.addEventListener('keydown', onKey);

  if (mode !== 'card') begin();

  return {
    node,
    title: level.name,
    focus: mode === 'card' ? card.querySelector('button') : target,
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey);
      speech.stop();
    },
  };
}
