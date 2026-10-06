// One play-through of a level: which word to ask next, missed-word review,
// and counting answers. Pure logic with an injectable `rng`; no DOM here.

import { pickDistractors } from './distractors.js';
import { pointsForAnswer, streakBonus } from './scoring.js';

/** Ask a missed word again after this many other questions. */
export const REVIEW_GAP = 3;

export function randomItem(list, rng = Math.random) {
  return list[Math.floor(rng() * list.length)];
}

export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick a target from `pool`, never the previous one.
 * Recently asked words are avoided too, so the round feels varied.
 */
export function pickTarget(pool, { last = null, recent = [], rng = Math.random } = {}) {
  if (!pool.length) throw new Error('Cannot pick from an empty word pool');
  if (pool.length === 1) return pool[0];
  const notLast = pool.filter((w) => w !== last);
  const fresh = notLast.filter((w) => !recent.includes(w));
  return randomItem(fresh.length ? fresh : notLast, rng);
}

export function createRound(level, { extraPool = [], rng = Math.random } = {}) {
  return {
    levelId: level.id,
    pool: level.words.slice(),
    extraPool,
    cards: level.cards,
    mode: level.distractors,
    goal: level.goal,
    rng,
    questionNo: 0,
    correct: 0,
    firstTry: 0,
    streak: 0,
    bestStreak: 0,
    score: 0,
    target: null,
    choices: [],
    attempts: 0,
    recent: [],
    review: [], // [{ word, due }]
    missed: [],
  };
}

/** Advance to the next question. Returns { target, choices }. */
export function nextQuestion(round) {
  const { rng } = round;
  round.questionNo += 1;
  const last = round.target;
  const dueIndex = round.review.findIndex((r) => r.due <= round.questionNo && r.word !== last);
  let target;
  if (dueIndex >= 0) {
    target = round.review[dueIndex].word;
    round.review.splice(dueIndex, 1);
  } else {
    const keep = Math.min(3, round.pool.length - 1);
    target = pickTarget(round.pool, { last, recent: round.recent.slice(-keep), rng });
  }
  round.recent.push(target);
  round.target = target;
  round.attempts = 0;
  const distractors = pickDistractors(target, {
    pool: round.pool,
    extraPool: round.extraPool,
    count: round.cards - 1,
    mode: round.mode,
    rng,
  });
  round.choices = shuffle([target, ...distractors], rng);
  return { target, choices: round.choices };
}

/**
 * Record a tap. Wrong answers never cost points: they just queue the word for
 * review later in the round.
 */
export function answer(round, word) {
  round.attempts += 1;
  if (word !== round.target) {
    round.streak = 0;
    if (round.attempts === 1) {
      if (!round.missed.includes(round.target)) round.missed.push(round.target);
      if (!round.review.some((r) => r.word === round.target)) {
        round.review.push({ word: round.target, due: round.questionNo + REVIEW_GAP });
      }
    }
    return { correct: false, points: 0, bonus: 0 };
  }
  const firstTry = round.attempts === 1;
  round.correct += 1;
  if (firstTry) {
    round.firstTry += 1;
    round.streak += 1;
    round.bestStreak = Math.max(round.bestStreak, round.streak);
  }
  const points = pointsForAnswer(round.attempts);
  const bonus = firstTry ? streakBonus(round.streak) : 0;
  round.score += points + bonus;
  return { correct: true, firstTry, points, bonus, done: isComplete(round) };
}

export function isComplete(round) {
  return round.correct >= round.goal;
}
