import { describe, it, expect } from 'vitest';
import { formatWord, normalizeWord } from '../js/text.js';
import { pickPraise, PRAISE, correctionPhrases } from '../js/praise.js';
import { seeded } from './helpers/rng.js';

describe('word display', () => {
  it('shows lowercase by default, except "I"', () => {
    expect(formatWord('Cat')).toBe('cat');
    expect(formatWord('I')).toBe('I');
    expect(formatWord('i')).toBe('I');
  });

  it('supports Title Case', () => {
    expect(formatWord('ship', 'title')).toBe('Ship');
    expect(formatWord('I', 'title')).toBe('I');
  });

  it('normalizes for comparison', () => {
    expect(normalizeWord(' Dog ')).toBe('dog');
    expect(normalizeWord('i')).toBe('I');
  });
});

describe('praise', () => {
  it('varies and never repeats the last phrase', () => {
    const rng = seeded(1);
    let last = null;
    const seen = new Set();
    for (let i = 0; i < 100; i += 1) {
      const p = pickPraise(rng, last);
      expect(p).not.toBe(last);
      seen.add(p);
      last = p;
    }
    expect(seen.size).toBe(PRAISE.length);
  });

  it('corrects by naming the tapped word, then repeats the target', () => {
    expect(correctionPhrases('hat', 'cat')).toEqual(['That word is hat.', 'Find the word…', 'cat']);
  });
});
