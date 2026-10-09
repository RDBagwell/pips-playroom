// Math Garden: one level. Pip asks a question ("What is four plus three?" or
// "Is this right? Three plus two equals five.") and the child taps an answer.
// A wrong tap gets a gentle wobble and Pip explains, counting along with the
// picture. Missed questions come back later in the round. There is no timer,
// unless a grown-up turns on "Beat your own time", which only ever counts up.

import { el } from '../../../core/dom.js';
import { go } from '../../../core/router.js';
import { ctx, activeProfile, activeProgress, gameSettings, levelsOf, save, prefersReducedMotion } from '../../../core/context.js';
import { screen, iconButton } from '../../../core/ui.js';
import { applyLevelResult, isUnlocked, noteTricky, addStat } from '../../../core/progress.js';
import { levelBonus } from '../../../core/scoring.js';
import { createMascot } from '../../../core/mascot.js';
import { confetti, flyPoints } from '../../../core/effects.js';
import { numberToWords } from '../../../core/number-words.js';
import { createRound, nextQuestion, answer, roundStars } from '../round.js';
import { explanation, factFamily } from '../questions.js';
import { buildPicture } from '../pictures.js';

const GAME = 'math-garden';
const MIN_CELEBRATE_MS = 900;
const COUNT_STEP_MS = 520;

export const PRAISE = ['Great job!', 'You got it!', 'Yes! That’s right!', 'Super!', 'Well done!', 'Wonderful!', 'Nice thinking!'];

/** 83 tenths of a second → "0:08.3"; for the optional "beat your own time". */
export function formatTime(tenths) {
  const total = Math.max(0, Math.round(tenths));
  const minutes = Math.floor(total / 600);
  const seconds = Math.floor((total % 600) / 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${total % 10}`;
}

/** What Pip says after a wrong tap. */
export function wrongPhrases(q) {
  const ex = explanation(q);
  if (q.kind === 'truefalse') {
    const lead = q.isTrue ? 'It is right! Let’s check.' : `Not quite. It isn’t ${numberToWords(q.shown)}.`;
    return { lines: [lead, ...ex.lines], count: ex.count };
  }
  return ex;
}

export function playScreen({ levelId }) {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  const playerProgress = activeProgress(GAME);
  const levels = levelsOf(GAME);
  const level = levels.find((l) => l.id === levelId);
  const s = gameSettings(GAME);
  if (!level || !isUnlocked(playerProgress, level.id, { unlockAll: s.unlockAll })) return { redirect: `${GAME}/map` };

  const { speech } = ctx;
  const round = createRound(level);
  const calm = prefersReducedMotion();
  const alwaysPictures = level.pictures === 'always' || s.pictures === 'always';
  let locked = true;
  let destroyed = false;
  let lastPraise = null;
  let lastLines = [];
  let picture = null;
  let countTimers = [];
  const timers = new Set();
  const started = performance.now();
  let clock = null;

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
  const scoreBox = el('div', { class: 'score-box' },
    el('span', { class: 'sr-only', text: 'Score: ' }),
    el('span', { class: 'coin', 'aria-hidden': 'true', text: '🪙' }), scoreValue);
  const dots = Array.from({ length: level.goal }, () => el('span', { class: 'dot', 'aria-hidden': 'true' }));
  const progress = el('div', {
    class: 'progress', role: 'progressbar', 'aria-label': 'Questions right',
    'aria-valuemin': 0, 'aria-valuemax': level.goal, 'aria-valuenow': 0,
  }, ...dots);
  const stopwatch = s.sprint ? el('span', { class: 'stopwatch', role: 'timer', 'aria-label': 'Your time', text: '⏱ 0:00.0' }) : null;
  const pictureSlot = el('div', { class: 'picture-slot' });
  const equation = el('p', { class: 'equation', 'aria-hidden': 'true' });
  const answers = el('div', { class: 'math-answers', role: 'group', 'aria-label': 'Answers' });
  const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  const mascot = createMascot('idle');
  const hear = el('button', { type: 'button', class: 'hear-button', 'aria-keyshortcuts': 'R', on: { click: repeat } },
    el('span', { class: 'hear-icon', 'aria-hidden': 'true', text: '🔊' }), el('span', { class: 'hear-label', text: 'Hear it again' }));
  const showMe = el('button', { type: 'button', class: 'big-button secondary show-me', hidden: true, on: { click: () => showPicture(true) } },
    el('span', { 'aria-hidden': 'true', text: '👀 ' }), 'Show me');

  const node = screen('math',
    el('header', { class: 'topbar play-topbar' },
      iconButton({ icon: '🗺️', label: 'Back to the map', onClick: () => go(`${GAME}/map`) }),
      el('h1', { class: 'topbar-title' },
        el('span', { class: 'level-badge', style: { '--stone-color': level.color }, text: level.id }),
        el('span', { class: 'level-name', text: level.name })),
      el('div', { class: 'topbar-actions' }, stopwatch, scoreBox)),
    progress,
    el('div', { class: 'math-area' },
      el('aside', { class: 'helper' }, el('div', { class: 'mascot-slot' }, mascot.node), hear),
      el('div', { class: 'math-board' }, pictureSlot, equation, answers, showMe)),
    status);

  // ----- talking -----
  function say(lines) {
    lastLines = lines;
    status.textContent = lines.join(' ');
    return speech.say(lines);
  }
  function repeat() {
    ctx.sfx?.play('tap');
    speech.say(lastLines);
  }

  // ----- pictures -----
  function stopCounting() {
    countTimers.forEach(clearTimeout);
    countTimers = [];
    if (picture) picture.countables.forEach((c) => c.classList.remove('obj-counted'));
  }
  function showPicture(fromButton = false) {
    if (!picture) return;
    pictureSlot.hidden = false;
    showMe.hidden = true;
    if (fromButton) ctx.sfx?.play('tap');
  }
  /** Light the objects up one by one while Pip counts (all at once with reduced motion). */
  function countAlong(n) {
    stopCounting();
    if (!picture || !n) return;
    const items = picture.countables.slice(0, n);
    if (calm) {
      items.forEach((c) => c.classList.add('obj-counted'));
      return;
    }
    items.forEach((c, i) => countTimers.push(later(() => c.classList.add('obj-counted'), 900 + i * COUNT_STEP_MS)));
  }

  // ----- a question -----
  function render(q) {
    stopCounting();
    picture = buildPicture(q);
    pictureSlot.replaceChildren(picture.node);
    pictureSlot.hidden = !alwaysPictures && q.skill !== 'count';
    showMe.hidden = !pictureSlot.hidden || level.pictures === 'none';
    equation.textContent = q.skill === 'count'
      ? (q.kind === 'pick' ? 'How many?' : `${q.shown}?`)
      : q.text;
    const buttons = q.kind === 'pick'
      ? q.choices.map((n, i) => el('button', {
        type: 'button', class: 'math-choice', dataset: { value: String(n) }, 'aria-keyshortcuts': String(i + 1),
        style: { '--i': String(i) }, on: { click: (e) => onAnswer(e.currentTarget, n) },
      }, String(n)))
      : [
        el('button', { type: 'button', class: 'math-choice tf tf-yes', dataset: { value: 'true' }, 'aria-keyshortcuts': 'Y', 'aria-label': 'Yes, that’s right', on: { click: (e) => onAnswer(e.currentTarget, true) } },
          el('span', { class: 'tf-mark', 'aria-hidden': 'true', text: '✔' }), el('span', { class: 'tf-label', text: 'Right' })),
        el('button', { type: 'button', class: 'math-choice tf tf-no', dataset: { value: 'false' }, 'aria-keyshortcuts': 'N', 'aria-label': 'No, that’s not right', on: { click: (e) => onAnswer(e.currentTarget, false) } },
          el('span', { class: 'tf-mark', 'aria-hidden': 'true', text: '✘' }), el('span', { class: 'tf-label', text: 'Not right' })),
      ];
    answers.dataset.kind = q.kind;
    answers.replaceChildren(...buttons);
  }

  function ask() {
    const q = nextQuestion(round);
    render(q);
    locked = false;
    say(q.speech);
  }

  function updateScore() {
    scoreValue.textContent = round.score.toLocaleString();
    progress.setAttribute('aria-valuenow', String(round.correct));
    dots.forEach((d, i) => d.classList.toggle('on', i < round.correct));
  }

  async function onAnswer(button, value) {
    if (locked || destroyed) return;
    const q = round.question;
    const result = answer(round, value);
    if (!result.correct) {
      button.classList.remove('wrong');
      void button.offsetWidth; // restart the wobble
      button.classList.add('wrong', 'tried');
      ctx.sfx?.play('soft');
      mascot.nod();
      showPicture();
      const help = wrongPhrases(q);
      say(help.lines);
      countAlong(help.count);
      return;
    }
    locked = true;
    stopCounting();
    button.classList.add('correct');
    answers.classList.add('answered');
    ctx.sfx?.play('correct');
    mascot.cheer();
    confetti(button);
    flyPoints(button, scoreBox, `+${result.points}`);
    later(updateScore, 600);
    lastPraise = PRAISE.filter((p) => p !== lastPraise)[Math.floor(Math.random() * (PRAISE.length - 1))];
    status.textContent = `${lastPraise} ${result.points} points.`;
    await Promise.all([speech.say(lastPraise), wait(MIN_CELEBRATE_MS)]);
    if (destroyed) return;
    answers.classList.remove('answered');
    if (result.done) finish();
    else ask();
  }

  function finish() {
    clearInterval(clock);
    const stars = roundStars(round);
    const bonus = levelBonus(stars);
    const score = round.score + bonus;
    const outcome = applyLevelResult(playerProgress, level, { score, stars }, levels.length);
    round.missed.forEach((q) => noteTricky(playerProgress, factFamily(q)));
    addStat(playerProgress, 'questions', round.questionNo);
    addStat(playerProgress, 'firstTry', round.firstTry);
    addStat(playerProgress, 'missed', round.missed.length);
    const tally = [['Questions right', round.level.goal], ['First try', round.firstTry]];
    if (s.sprint) {
      const tenths = Math.round((performance.now() - started) / 100);
      const key = `time${level.id}`;
      const best = playerProgress.stats[key];
      if (!best || tenths < best) playerProgress.stats[key] = tenths;
      tally.push(['Your time', formatTime(tenths)], ['Your best time', formatTime(playerProgress.stats[key])]);
    }
    save();
    go(`${GAME}/complete`, { levelId: level.id, stars, bonus, base: round.score, score, outcome, tally });
  }

  // ----- keyboard: 1–4 pick an answer, Y / N for right or not, R repeats -----
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const buttons = [...answers.children];
    let target = null;
    if (/^[1-4]$/.test(e.key) && answers.dataset.kind === 'pick') target = buttons[Number(e.key) - 1];
    else if (/^[yY]$/.test(e.key) && answers.dataset.kind === 'truefalse') target = buttons[0];
    else if (/^[nN]$/.test(e.key) && answers.dataset.kind === 'truefalse') target = buttons[1];
    else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      repeat();
      return;
    }
    if (target) {
      e.preventDefault();
      target.focus();
      target.click();
    }
  }
  document.addEventListener('keydown', onKey);

  if (stopwatch) {
    clock = setInterval(() => {
      stopwatch.textContent = `⏱ ${formatTime((performance.now() - started) / 100)}`;
    }, 100);
  }

  later(ask, calm ? 50 : 350);

  return {
    node,
    title: level.name,
    focus: hear,
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      clearInterval(clock);
      document.removeEventListener('keydown', onKey);
      speech.stop();
    },
  };
}
