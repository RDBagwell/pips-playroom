// One thing to type (a letter, a word or a sentence), and the sums for a
// level: accuracy, stars and the optional words per minute. Pure.

import { accuracyStars } from '../../core/scoring.js';
import { matches } from './keys.js';

export function createTyping(text) {
  return { text, index: 0, correct: 0, wrong: 0, misses: {}, done: false };
}

export const nextChar = (t) => (t.done ? null : t.text[t.index]);

/**
 * Type one character. A wrong key changes nothing on screen (it is noted,
 * gently, and the right key is shown); nothing is ever deleted.
 * Returns 'correct', 'wrong', 'done' (the last character) or 'ignored'.
 */
export function typeChar(t, char) {
  if (t.done || char === null || char === undefined) return 'ignored';
  const expected = t.text[t.index];
  if (!matches(char, expected)) {
    t.wrong += 1;
    t.misses[expected] = (t.misses[expected] || 0) + 1;
    return 'wrong';
  }
  t.correct += 1;
  t.index += 1;
  if (t.index >= t.text.length) {
    t.done = true;
    return 'done';
  }
  return 'correct';
}

/** Keystroke accuracy, 0..1 (1 when nothing has been typed yet). */
export function accuracy(correct, wrong) {
  const total = correct + wrong;
  return total ? correct / total : 1;
}

/**
 * Stars from accuracy, never speed: 3 stars at 90%+, 2 at 75%+, and always
 * at least one for finishing.
 */
export function typingStars(correct, wrong) {
  return accuracyStars(correct, correct + wrong, { three: 0.9, two: 0.75 });
}

/** Points: one per character typed right, never taken away. */
export const pointsFor = (t) => t.correct;

/**
 * Words per minute, the usual way (five characters is one "word").
 * Information for grown-ups who switch it on, never a pass mark.
 */
export function wordsPerMinute(chars, ms) {
  if (!chars || !ms || ms <= 0) return 0;
  return Math.round((chars / 5) / (ms / 60000));
}

/** Pick `count` items for a round, never the same twice in a row. */
export function pickItems(pool, count, rng = Math.random) {
  const out = [];
  let bag = [];
  while (out.length < count) {
    if (!bag.length) bag = shuffled(pool, rng);
    const next = bag.pop();
    if (out.length && next === out[out.length - 1] && pool.length > 1) {
      bag.unshift(next);
      continue;
    }
    out.push(next);
  }
  return out;
}

function shuffled(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
