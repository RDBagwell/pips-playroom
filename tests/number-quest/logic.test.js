import { describe, it, expect } from 'vitest';
import {
  optimalGuesses, starThresholds, roundStars, levelStars, pointsForRound, pickNumber,
  createQuest, guess, remaining, middleOf, hintReady, useHint, isNearMiddle, mixupKey,
  startPhrases, resultPhrases, hintPhrases, rangeOf, trickyRanges,
} from '../../games/number-quest/logic.js';
import { seeded } from '../helpers/rng.js';

/** Play a whole round with the halving strategy. Returns the number of guesses. */
function halving(min, max, target) {
  const q = createQuest({ min, max, target });
  let r;
  do r = guess(q, middleOf(q)); while (r.kind !== 'found');
  return r.guesses;
}

describe('the best possible number of guesses', () => {
  it('matches the halving strategy for each range', () => {
    expect([5, 10, 20, 30, 50, 100].map(optimalGuesses)).toEqual([3, 4, 5, 5, 6, 7]);
    expect(() => optimalGuesses(0)).toThrow();
  });

  it('is never beaten by halving, and halving always reaches it', () => {
    for (const max of [5, 10, 20, 30, 50, 100]) {
      let worst = 0;
      for (let t = 1; t <= max; t += 1) worst = Math.max(worst, halving(1, max, t));
      expect(worst, `1-${max}`).toBe(optimalGuesses(max));
    }
  });
});

describe('stars', () => {
  it('uses generous thresholds against the optimal guess count', () => {
    expect(starThresholds(100)).toEqual({ best: 7, three: 8, two: 15 });
    expect(starThresholds(10)).toEqual({ best: 4, three: 5, two: 9 });
    expect([1, 7, 8, 9, 15, 16, 60].map((g) => roundStars(g, 100))).toEqual([3, 3, 3, 2, 2, 1, 1]);
  });

  it('gives three stars to every round played with the halving strategy', () => {
    for (const max of [5, 10, 20, 30, 50, 100]) {
      for (let t = 1; t <= max; t += 1) expect(roundStars(halving(1, max, t), max)).toBe(3);
    }
  });

  it('always gives at least one star, even counting up one at a time', () => {
    for (const max of [5, 10, 100]) expect(roundStars(max, max)).toBeGreaterThanOrEqual(1);
    expect(roundStars(5, 5)).toBe(2); // 1, 2, 3, 4, 5 on a 1–5 level is still two stars
    expect(roundStars(10, 10)).toBe(1);
    expect(levelStars([])).toBe(1);
    expect(levelStars([1, 1, 1])).toBe(1);
  });

  it('averages the rounds for the level, rounding half up', () => {
    expect(levelStars([3, 3, 3])).toBe(3);
    expect(levelStars([3, 2])).toBe(3);
    expect(levelStars([3, 2, 2])).toBe(2);
    expect(levelStars([1, 2])).toBe(2);
    expect(levelStars([1, 1, 2])).toBe(1);
  });

  it('awards points that only ever add up', () => {
    expect([1, 2, 3].map(pointsForRound)).toEqual([10, 15, 20]);
    expect(pointsForRound(0)).toBe(10);
  });
});

describe('narrowing the range', () => {
  it('says higher or lower and narrows low..high', () => {
    const q = createQuest({ min: 1, max: 10, target: 7 });
    expect(guess(q, 5)).toEqual({ kind: 'higher' });
    expect([q.low, q.high]).toEqual([6, 10]);
    expect(guess(q, 9)).toEqual({ kind: 'lower' });
    expect([q.low, q.high]).toEqual([6, 8]);
    expect(remaining(q)).toBe(3);
    expect(guess(q, 7)).toEqual({ kind: 'found', guesses: 3 });
    expect(q.found).toBe(true);
    expect(guess(q, 7)).toEqual({ kind: 'done' });
  });

  it('does not count guesses outside the range or already ruled out', () => {
    const q = createQuest({ min: 1, max: 20, target: 15 });
    expect(guess(q, 0)).toEqual({ kind: 'out-of-range' });
    expect(guess(q, 21)).toEqual({ kind: 'out-of-range' });
    expect(guess(q, 2.5)).toEqual({ kind: 'invalid' });
    expect(guess(q, NaN)).toEqual({ kind: 'invalid' });
    guess(q, 10);
    expect(guess(q, 4)).toEqual({ kind: 'ruled-out', direction: 'higher', clue: 10 });
    guess(q, 18);
    expect(guess(q, 19)).toEqual({ kind: 'ruled-out', direction: 'lower', clue: 18 });
    expect(q.guesses).toEqual([10, 18]);
    expect(q.mixups).toEqual([[4, 10], [19, 18]]);
    expect(q.mixups.map(mixupKey)).toEqual(['4|10', '18|19']);
  });

  it('notices guesses near the middle of what is left', () => {
    expect(isNearMiddle(50, 1, 100)).toBe(true);
    expect(isNearMiddle(30, 1, 100)).toBe(true);
    expect(isNearMiddle(10, 1, 100)).toBe(false);
    const q = createQuest({ min: 1, max: 100, target: 90 });
    guess(q, 50); // middle
    guess(q, 51); // edge of 51..100
    expect([q.splitChances, q.goodSplits]).toEqual([2, 1]);
  });

  it('refuses a broken quest', () => {
    expect(() => createQuest({ min: 5, max: 5, target: 5 })).toThrow();
    expect(() => createQuest({ min: 1, max: 10, target: 11 })).toThrow();
  });
});

describe("Pip's hint", () => {
  it('is offered only after a few guesses, never before', () => {
    const q = createQuest({ min: 1, max: 30, target: 29 });
    expect(hintReady(q, 3)).toBe(false);
    guess(q, 1);
    guess(q, 2);
    expect(hintReady(q, 3)).toBe(false);
    guess(q, 3);
    expect(hintReady(q, 3)).toBe(true);
  });

  it('suggests the middle of the remaining range', () => {
    const q = createQuest({ min: 1, max: 100, target: 80 });
    expect(useHint(q)).toEqual({ middle: 50, low: 1, high: 100, onlyOne: false });
    guess(q, 50);
    expect(useHint(q).middle).toBe(75);
    guess(q, 75);
    guess(q, 88);
    expect(useHint(q)).toMatchObject({ middle: 81, low: 76, high: 87 });
    expect(q.hintsUsed).toBe(3);
    expect(hintPhrases(useHint(q))).toEqual(['Try a number in the middle!', 'How about 81?']);
  });

  it('says so when only one number is left', () => {
    const q = createQuest({ min: 1, max: 5, target: 3 });
    guess(q, 2);
    guess(q, 4);
    const hint = useHint(q);
    expect(hint.onlyOne).toBe(true);
    expect(hintPhrases(hint)).toEqual(["There's only one number left. It must be 3!"]);
    expect(hintReady(q, 1)).toBe(true);
  });

  it('is never needed: a round can always be finished without it', () => {
    const q = createQuest({ min: 1, max: 5, target: 5 });
    for (const n of [1, 2, 3, 4]) guess(q, n);
    expect(guess(q, 5).kind).toBe('found');
    expect(q.hintsUsed).toBe(0);
  });
});

describe('picking a number', () => {
  it('stays in range and avoids the last few', () => {
    const rng = seeded(3);
    for (let i = 0; i < 300; i += 1) {
      const n = pickNumber(1, 5, { recent: [1, 2], rng });
      expect([3, 4, 5]).toContain(n);
    }
    expect(pickNumber(1, 3, { recent: [1, 2, 3], rng: () => 0 })).toBe(1);
  });
});

describe('what Pip says', () => {
  it('speaks every guess and clue', () => {
    expect(startPhrases({ min: 1, max: 10 })).toEqual(["I'm thinking of a number from 1 to 10.", 'Can you guess it?']);
    expect(resultPhrases(5, { kind: 'higher' })).toEqual(['5?', 'Higher!']);
    expect(resultPhrases(9, { kind: 'lower' })).toEqual(['9?', 'Lower!']);
    expect(resultPhrases(7, { kind: 'found', guesses: 3 })).toEqual(['7!', 'You found it in 3 guesses!']);
    expect(resultPhrases(7, { kind: 'found', guesses: 1 })[1]).toMatch(/first guess/);
    expect(resultPhrases(4, { kind: 'ruled-out', direction: 'higher', clue: 10 })).toEqual(['4?', 'Remember, my number is higher than 10.']);
  });

  it('never says anything harsh', () => {
    const all = [
      ...startPhrases({ min: 1, max: 5 }),
      ...['higher', 'lower'].flatMap((kind) => resultPhrases(3, { kind })),
      ...resultPhrases(3, { kind: 'ruled-out', direction: 'lower', clue: 2 }),
      ...resultPhrases(3, { kind: 'found', guesses: 9 }),
    ].join(' ');
    expect(all).not.toMatch(/wrong|no!|bad|fail|lost|game over|too bad/i);
  });
});

describe('number ranges for grown-ups', () => {
  it('puts numbers in ranges of ten', () => {
    expect([1, 7, 10, 24, 29, 50, 99, 100].map(rangeOf)).toEqual([[1, 9], [1, 9], [10, 19], [20, 29], [20, 29], [50, 59], [90, 99], [90, 100]]);
  });

  it('groups mixed-up pairs by range, most mixed-up first, with an example', () => {
    expect(trickyRanges({ '24|27': 2, '21|26': 1, '3|5': 1, '68|72': 4, bad: 9 })).toEqual([
      { range: [70, 79], times: 4, example: [68, 72] },
      { range: [20, 29], times: 3, example: [24, 27] },
      { range: [1, 9], times: 1, example: [3, 5] },
    ]);
    expect(trickyRanges({})).toEqual([]);
  });
});
