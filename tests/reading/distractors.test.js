import { describe, it, expect } from 'vitest';
import { pickDistractors, rime, levenshtein, matchesMode, areHomophones } from '../js/distractors.js';
import { seeded } from './helpers/rng.js';

const shortA = 'cat hat bat rat mat sat map sad man can fan pan van jam bag tag cap nap dad ran'.split(' ');

function run(mode, target, pool, count, extraPool = [], seed = 1) {
  return pickDistractors(target, { pool, extraPool, count, mode, rng: seeded(seed) });
}

describe('helpers', () => {
  it('finds the rime (word family)', () => {
    expect(rime('cat')).toBe('at');
    expect(rime('ship')).toBe('ip');
    expect(rime('train')).toBe('ain');
    expect(rime('play')).toBe('ay');
  });

  it('computes edit distance', () => {
    expect(levenshtein('ship', 'shop')).toBe(1);
    expect(levenshtein('ship', 'chip')).toBe(1);
    expect(levenshtein('cat', 'dog')).toBe(3);
  });

  it('knows homophones', () => {
    expect(areHomophones('to', 'two')).toBe(true);
    expect(areHomophones('to', 'to')).toBe(false);
    expect(areHomophones('cat', 'hat')).toBe(false);
  });
});

describe('pickDistractors', () => {
  it('never includes the target or duplicates, in any mode', () => {
    for (const mode of ['different-start', 'rhyme', 'look-alike', 'mixed']) {
      for (let seed = 1; seed < 30; seed += 1) {
        const pool = [...shortA, 'cat', 'CAT'];
        const d = run(mode, 'cat', pool, 5, ['hat', 'dog', 'cat'], seed);
        expect(d).toHaveLength(5);
        expect(d).not.toContain('cat');
        expect(new Set(d).size).toBe(5);
      }
    }
  });

  it('different-start: every choice starts with a different letter', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const d = run('different-start', 'cat', shortA, 3, [], seed);
      const starts = ['cat', ...d].map((w) => w[0]);
      expect(new Set(starts).size).toBe(4);
    }
  });

  it('rhyme: picks from the same word family first', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const d = run('rhyme', 'cat', shortA, 4, [], seed);
      for (const w of d) expect(rime(w)).toBe('at');
    }
  });

  it('rhyme: falls back gracefully when the family is small', () => {
    const d = run('rhyme', 'jam', shortA, 3);
    expect(d).toHaveLength(3);
    expect(d).not.toContain('jam');
  });

  it('look-alike: shares the first letter or most of the spelling', () => {
    const pool = 'ship shop chip chin shed fish dish wish chop duck back sock'.split(' ');
    for (let seed = 1; seed < 30; seed += 1) {
      const d = run('look-alike', 'ship', pool, 5, [], seed);
      for (const w of d) expect(matchesMode('look-alike', 'ship', w), w).toBe(true);
      expect(d).toContain('shop');
      expect(d).toContain('chip');
    }
  });

  it('mixed: blends look-alikes with other words', () => {
    const pool = 'ship shop chip chin shed fish dish wish chop duck back sock'.split(' ');
    const d = run('mixed', 'ship', pool, 8);
    const look = d.slice(0, 4);
    for (const w of look) expect(matchesMode('look-alike', 'ship', w)).toBe(true);
    expect(d).toHaveLength(8);
  });

  it('only uses earlier-level words when the level runs short', () => {
    const d = run('different-start', 'cat', shortA, 5, ['zoo', 'egg']);
    expect(d).not.toContain('zoo');
    expect(d).not.toContain('egg');
    // Level words come first; the top-up still prefers words that fit the mode.
    const small = run('rhyme', 'cat', ['cat', 'dog', 'sun'], 4, ['hat', 'bat', 'pig']);
    expect(small.slice(0, 2).sort()).toEqual(['dog', 'sun']);
    expect(small.slice(2).sort()).toEqual(['bat', 'hat']);
    expect(small).toHaveLength(4);
  });

  it('never puts a homophone of the target on screen', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const d = run('mixed', 'to', ['to', 'two', 'too', 'go', 'do', 'no', 'so'], 4, [], seed);
      expect(d).not.toContain('two');
      expect(d).not.toContain('too');
    }
  });

  it('throws on impossible requests', () => {
    expect(() => run('rhyme', 'cat', ['cat', 'hat'], 3)).toThrow(/Not enough/);
    expect(() => run('spooky', 'cat', shortA, 3)).toThrow(/Unknown/);
  });

  it('is deterministic for a given rng', () => {
    expect(run('mixed', 'cat', shortA, 5, [], 42)).toEqual(run('mixed', 'cat', shortA, 5, [], 42));
  });
});
