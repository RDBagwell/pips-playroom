import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, activeProfile, settings, save, prefersReducedMotion } from '../context.js';
import { screen, iconButton } from '../ui.js';
import { earlierWords } from '../levels.js';
import { createRound, nextQuestion, answer } from '../round.js';
import { starsFor, levelBonus } from '../scoring.js';
import { applyLevelResult, isUnlocked } from '../progress.js';
import { pickPraise, askPhrases, correctionPhrases } from '../praise.js';
import { formatWord } from '../text.js';
import { createMascot } from '../mascot.js';
import { confetti, flyPoints } from '../effects.js';

const MIN_CELEBRATE_MS = 900;

register('play', ({ levelId }) => {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  const level = ctx.levels.find((l) => l.id === levelId);
  if (!level || !isUnlocked(profile, level.id, { unlockAll: settings().unlockAll })) return { redirect: 'map' };

  const { speech } = ctx;
  const round = createRound(level, { extraPool: earlierWords(ctx.levels, level.id) });
  const wordCase = settings().wordCase;
  let locked = true;
  let destroyed = false;
  let lastPraise = null;
  const timers = new Set();

  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!destroyed) fn();
    }, ms);
    timers.add(t);
  };
  const wait = (ms) => new Promise((resolve) => later(resolve, ms));

  // ----- DOM -----
  const scoreValue = el('span', { class: 'score-value', text: '0' });
  const scoreBox = el('div', { class: 'score-box', 'aria-label': 'Score' },
    el('span', { class: 'coin', 'aria-hidden': 'true', text: '🪙' }), scoreValue);
  const dots = Array.from({ length: round.goal }, () => el('span', { class: 'dot', 'aria-hidden': 'true' }));
  const progress = el('div', {
    class: 'progress', role: 'progressbar', 'aria-label': 'Words found',
    'aria-valuemin': 0, 'aria-valuemax': round.goal, 'aria-valuenow': 0,
  }, ...dots);
  const cards = el('div', { class: 'cards', 'data-count': level.cards, role: 'group', 'aria-label': 'Word cards' });
  const hear = el('button', {
    type: 'button', class: 'hear-button', 'aria-keyshortcuts': 'R',
    on: { click: repeat },
  }, el('span', { class: 'hear-icon', 'aria-hidden': 'true', text: '🔊' }), el('span', { class: 'hear-label', text: 'Hear it again' }));
  const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });
  const mascot = createMascot('idle');
  const mascotSlot = el('div', { class: 'mascot-slot' }, mascot.node);

  const node = screen('play',
    el('header', { class: 'topbar play-topbar' },
      iconButton({ icon: '🗺️', label: 'Back to the map', onClick: () => go('map') }),
      el('h1', { class: 'topbar-title' },
        el('span', { class: 'level-badge', style: { '--stone-color': level.color }, text: level.id }),
        el('span', { class: 'level-name', text: level.name })),
      el('div', { class: 'topbar-actions' }, scoreBox),
    ),
    progress,
    el('div', { class: 'play-area' },
      el('aside', { class: 'helper' }, mascotSlot, hear),
      cards,
    ),
    status,
  );

  // ----- game flow -----
  function renderCards(choices) {
    const buttons = choices.map((word, i) =>
      el('button', {
        type: 'button', class: 'card', dataset: { word },
        'aria-keyshortcuts': String(i + 1),
        style: { '--i': String(i) },
        on: { click: (e) => onCard(e.currentTarget, word) },
      },
      el('span', { class: 'card-word', text: formatWord(word, wordCase) })));
    cards.replaceChildren(...buttons);
  }

  function ask() {
    const { target, choices } = nextQuestion(round);
    renderCards(choices);
    locked = false;
    status.textContent = 'Listen and find the word.';
    speech.say(askPhrases(target));
  }

  function repeat() {
    if (!round.target) return;
    ctx.sfx?.play('tap');
    speech.say(round.target);
  }

  function updateScore() {
    scoreValue.textContent = round.score.toLocaleString();
    progress.setAttribute('aria-valuenow', String(round.correct));
    dots.forEach((d, i) => d.classList.toggle('on', i < round.correct));
  }

  async function onCard(button, word) {
    if (locked || destroyed) return;
    const result = answer(round, word);

    if (!result.correct) {
      button.classList.remove('wrong');
      void button.offsetWidth; // restart the wobble
      button.classList.add('wrong', 'tried');
      ctx.sfx?.play('soft');
      mascot.nod();
      status.textContent = `That word is ${word}. Try again.`;
      // Hearing the word they tapped turns every mistake into a small lesson.
      speech.say(correctionPhrases(word, round.target));
      return;
    }

    locked = true;
    button.classList.add('correct');
    cards.classList.add('answered');
    ctx.sfx?.play('correct');
    mascot.cheer();
    confetti(button);
    flyPoints(button, scoreBox, `+${result.points + result.bonus}`);
    later(updateScore, 600);
    lastPraise = pickPraise(Math.random, lastPraise);
    status.textContent = `${lastPraise} ${result.points + result.bonus} points.`;
    await Promise.all([speech.say(lastPraise), wait(MIN_CELEBRATE_MS)]);
    if (destroyed) return;
    cards.classList.remove('answered');
    if (result.done) finish();
    else ask();
  }

  function finish() {
    const stars = starsFor(round.firstTry, round.goal);
    const bonus = levelBonus(stars);
    const score = round.score + bonus;
    const outcome = applyLevelResult(profile, level, { score, stars }, ctx.levels.length);
    save();
    go('complete', {
      levelId: level.id, stars, bonus, base: round.score, score, outcome,
      firstTry: round.firstTry, goal: round.goal,
    });
  }

  // ----- keyboard: 1-9 pick a card, R (or space) repeats the word -----
  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key)) {
      const card = cards.children[Number(e.key) - 1];
      if (card) {
        e.preventDefault();
        card.focus();
        card.click();
      }
    } else if (e.key === 'r' || e.key === 'R' || (e.key === ' ' && !(e.target instanceof HTMLButtonElement))) {
      e.preventDefault();
      repeat();
    }
  }
  document.addEventListener('keydown', onKey);

  later(ask, prefersReducedMotion() ? 50 : 350);

  return {
    node,
    title: level.name,
    focus: hear,
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey);
      speech.stop();
    },
  };
});
