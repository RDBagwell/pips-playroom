// Number Quest: Pip is thinking of a number; the child guesses and Pip says
// "Higher!" or "Lower!" until they find it. Pure logic with an injectable
// `rng`; no DOM here.
//
// Nothing here ever takes anything away. Guesses outside the range, or of
// numbers already ruled out, don't count as guesses: Pip just reminds the
// child of the clue. Finding the number always earns at least one star.

import { MAX_STARS, clampStars } from '../../core/scoring.js';

/**
 * The fewest guesses that always finds a number in a range of `size` numbers,
 * by starting in the middle and halving what's left each time.
 * 1–5: 3, 1–10: 4, 1–20: 5, 1–30: 5, 1–50: 6, 1–100: 7.
 */
export function optimalGuesses(size) {
  if (!Number.isInteger(size) || size < 1) throw new Error('Range size must be a positive whole number');
  return Math.ceil(Math.log2(size + 1));
}

/**
 * Generous star thresholds for one number:
 *   3 stars: within one guess of the best possible (halving) count
 *   2 stars: up to about twice the best possible count
 *   1 star:  found it (always)
 */
export function starThresholds(size) {
  const best = optimalGuesses(size);
  return { best, three: best + 1, two: best * 2 + 1 };
}

export function roundStars(guesses, size) {
  const t = starThresholds(size);
  if (guesses <= t.three) return 3;
  if (guesses <= t.two) return 2;
  return 1;
}

/** A level's stars: the average of its rounds, rounded (half up), at least 1. */
export function levelStars(perRound) {
  if (!perRound.length) return 1;
  return clampStars(perRound.reduce((a, b) => a + b, 0) / perRound.length);
}

/** Points for finding one number: 10, plus 5 for each star above one. */
export function pointsForRound(stars) {
  return 10 + (Math.min(MAX_STARS, Math.max(1, stars)) - 1) * 5;
}

/** Pip's number, never the same as one of the last few. */
export function pickNumber(min, max, { recent = [], rng = Math.random } = {}) {
  const size = max - min + 1;
  const all = Array.from({ length: size }, (_, i) => min + i);
  const fresh = all.filter((n) => !recent.includes(n));
  const pool = fresh.length ? fresh : all;
  return pool[Math.floor(rng() * pool.length)];
}

export function createQuest({ min, max, target }) {
  if (!(Number.isInteger(min) && Number.isInteger(max) && min < max)) throw new Error('A quest needs whole numbers min < max');
  if (!Number.isInteger(target) || target < min || target > max) throw new Error('The target must be inside the range');
  return {
    min, max, target,
    low: min, // the number is somewhere in low..high
    high: max,
    guesses: [],
    found: false,
    mixups: [], // [[guessed, clue]] guesses of numbers already ruled out
    splitChances: 0, // guesses made with 3+ numbers still possible
    goodSplits: 0, // ...of which were near the middle of what was left
    hintsUsed: 0,
  };
}

export const remaining = (q) => q.high - q.low + 1;

/** Is `n` near the middle of low..high (the middle half)? */
export function isNearMiddle(n, low, high) {
  const size = high - low + 1;
  const mid = (low + high) / 2;
  return Math.abs(n - mid) <= size / 4;
}

/**
 * Make a guess. Returns one of:
 *   { kind: 'invalid' }                      not a whole number
 *   { kind: 'out-of-range' }                 outside min..max (not counted)
 *   { kind: 'ruled-out', direction, clue }   already ruled out (not counted):
 *                                            "it's higher than <clue>" / "lower than <clue>"
 *   { kind: 'higher' } / { kind: 'lower' }   counted; the range narrows
 *   { kind: 'found', guesses }               counted; well done!
 *   { kind: 'done' }                         already found
 */
export function guess(q, n) {
  if (q.found) return { kind: 'done' };
  if (!Number.isInteger(n)) return { kind: 'invalid' };
  if (n < q.min || n > q.max) return { kind: 'out-of-range' };
  if (n < q.low) {
    q.mixups.push([n, q.low - 1]);
    return { kind: 'ruled-out', direction: 'higher', clue: q.low - 1 };
  }
  if (n > q.high) {
    q.mixups.push([n, q.high + 1]);
    return { kind: 'ruled-out', direction: 'lower', clue: q.high + 1 };
  }
  if (remaining(q) >= 3) {
    q.splitChances += 1;
    if (isNearMiddle(n, q.low, q.high)) q.goodSplits += 1;
  }
  q.guesses.push(n);
  if (n === q.target) {
    q.found = true;
    q.low = n;
    q.high = n;
    return { kind: 'found', guesses: q.guesses.length };
  }
  if (n < q.target) {
    q.low = n + 1;
    return { kind: 'higher' };
  }
  q.high = n - 1;
  return { kind: 'lower' };
}

/** Pip's hint: the middle of what's left (rounded down). */
export function middleOf(q) {
  return Math.floor((q.low + q.high) / 2);
}

/** The hint is offered (never forced) after `after` counted guesses. */
export function hintReady(q, after) {
  return !q.found && q.guesses.length >= after;
}

export function useHint(q) {
  q.hintsUsed += 1;
  const middle = middleOf(q);
  return { middle, low: q.low, high: q.high, onlyOne: q.low === q.high };
}

/** A mix-up as a stable key: the two numbers, smaller first ("20|30"). */
export function mixupKey([a, b]) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// ----- what Pip says -----

export function startPhrases(level) {
  return [`I'm thinking of a number from ${level.min} to ${level.max}.`, 'Can you guess it?'];
}

export function resultPhrases(n, result) {
  switch (result.kind) {
    case 'higher':
      return [`${n}?`, 'Higher!'];
    case 'lower':
      return [`${n}?`, 'Lower!'];
    case 'found':
      return [`${n}!`, result.guesses === 1 ? 'You found it on the very first guess!' : `You found it in ${result.guesses} guesses!`];
    case 'ruled-out':
      return [`${n}?`, `Remember, my number is ${result.direction} than ${result.clue}.`];
    default:
      return [];
  }
}

export function hintPhrases(hint) {
  if (hint.onlyOne) return [`There's only one number left. It must be ${hint.low}!`];
  return ['Try a number in the middle!', `How about ${hint.middle}?`];
}

/** The range of ten a number sits in, for grown-ups: 7 → [1, 9], 24 → [20, 29], 100 → [90, 100]. */
export function rangeOf(n) {
  if (n < 10) return [Math.min(n, 1), 9];
  if (n >= 100) return [90, 100];
  const lo = Math.floor(n / 10) * 10;
  return [lo, lo + 9];
}

/**
 * Group mixed-up pairs ("20|30" → times) into ranges of ten, by the bigger
 * number of each pair: [{ range: [20, 29], times, example: [24, 27] }],
 * most mixed-up first.
 */
export function trickyRanges(tricky) {
  const groups = new Map();
  for (const [key, times] of Object.entries(tricky || {})) {
    const m = key.match(/^(\d+)\|(\d+)$/);
    if (!m) continue;
    const pair = [Number(m[1]), Number(m[2])];
    const range = rangeOf(Math.max(...pair));
    const id = range.join('-');
    const g = groups.get(id) || { range, times: 0, example: pair, exampleTimes: 0 };
    g.times += times;
    if (times > g.exampleTimes) {
      g.example = pair;
      g.exampleTimes = times;
    }
    groups.set(id, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.times - a.times || a.range[0] - b.range[0])
    .map(({ range, times, example }) => ({ range, times, example }));
}
