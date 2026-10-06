import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateLevels, normalizeLevels, earlierWords, loadLevels } from '../js/levels.js';
import { pickDistractors, matchesMode, HOMOPHONES, HETERONYMS } from '../js/distractors.js';
import { seeded } from './helpers/rng.js';

const raw = JSON.parse(readFileSync(new URL('../data/levels.json', import.meta.url), 'utf8'));
const levels = normalizeLevels(raw);

describe('data/levels.json', () => {
  it('passes validation', () => {
    expect(validateLevels(raw)).toEqual([]);
  });

  it('has 12 levels in order with the required fields', () => {
    expect(levels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const l of levels) {
      expect(typeof l.name).toBe('string');
      expect(typeof l.focus).toBe('string');
      expect(l.goal).toBeGreaterThan(0);
      expect(l.words.length).toBeGreaterThanOrEqual(15);
      expect(l.words.length).toBeLessThanOrEqual(30);
    }
  });

  it('has no duplicate words within a level', () => {
    for (const l of levels) expect(new Set(l.words).size).toBe(l.words.length);
  });

  it('keeps every word from the original v1 game', () => {
    const all = new Set(levels.flatMap((l) => l.words));
    for (const w of ['dog', 'cat', 'the', 'hop', 'hat', 'bat', 'house', 'cake', 'ball', 'box', 'fox', 'mouse', 'home', 'rat']) {
      expect(all.has(w), w).toBe(true);
    }
  });

  it('never uses words that sound alike or can be said two ways', () => {
    const all = new Set(levels.flatMap((l) => l.words));
    for (const group of HOMOPHONES) {
      expect(group.filter((w) => all.has(w)).length, group.join('/')).toBeLessThanOrEqual(1);
    }
    for (const w of HETERONYMS) expect(all.has(w), w).toBe(false);
  });

  it('follows the card-count ladder', () => {
    expect(levels.map((l) => l.cards)).toEqual([3, 4, 4, 6, 6, 6, 9, 9, 9, 9, 9, 9]);
  });

  it('can build a full set of cards for every word in every level', () => {
    for (const l of levels) {
      for (const target of l.words) {
        const d = pickDistractors(target, {
          pool: l.words,
          extraPool: earlierWords(levels, l.id),
          count: l.cards - 1,
          mode: l.distractors,
          rng: seeded(7),
        });
        expect(d).toHaveLength(l.cards - 1);
        expect(new Set(d).size).toBe(d.length);
        expect(d).not.toContain(target);
      }
    }
  });

  it('has enough words to honour each distractor mode', () => {
    for (const l of levels) {
      let matching = 0;
      let total = 0;
      for (const target of l.words) {
        const d = pickDistractors(target, {
          pool: l.words,
          extraPool: earlierWords(levels, l.id),
          count: l.cards - 1,
          mode: l.distractors,
          rng: seeded(3),
        });
        const mode = l.distractors === 'mixed' ? 'look-alike' : l.distractors;
        const considered = l.distractors === 'mixed' ? d.slice(0, Math.ceil(d.length / 2)) : d;
        matching += considered.filter((w) => matchesMode(mode, target, w)).length;
        total += considered.length;
        if (l.distractors === 'different-start') {
          // Every card starts with its own letter.
          const starts = [target, ...d].map((w) => w[0]);
          expect(new Set(starts).size, `${l.name}: ${target}`).toBe(starts.length);
        }
      }
      // Different-start is always achievable; the others depend on how many
      // words in the level share a family or spelling, so aim for most.
      const threshold = { 'different-start': 1, rhyme: 0.5, 'look-alike': 0.6, mixed: 0.5 }[l.distractors];
      expect(matching / total, `${l.name} (${l.distractors})`).toBeGreaterThanOrEqual(threshold);
    }
  });
});

describe('validateLevels', () => {
  const good = () => ({
    levels: [{ id: 1, name: 'A', focus: 'x', cards: 3, distractors: 'rhyme', words: 'cat hat bat rat mat sat pat fat vat map cap nap tap lap gap'.split(' ') }],
  });

  it('accepts a minimal valid level', () => {
    expect(validateLevels(good())).toEqual([]);
  });

  it('reports missing fields, bad modes, duplicates and bad words', () => {
    expect(validateLevels(null)).toHaveLength(1);
    const d = good();
    delete d.levels[0].name;
    d.levels[0].distractors = 'spooky';
    d.levels[0].words[1] = 'cat';
    d.levels[0].words[2] = 'Bat';
    const errors = validateLevels(d).join('\n');
    expect(errors).toMatch(/missing "name"/);
    expect(errors).toMatch(/"distractors" must be one of/);
    expect(errors).toMatch(/"cat" is listed twice/);
    expect(errors).toMatch(/"Bat" must be lowercase/);
  });

  it('rejects too few words, bad card counts, duplicate ids and homophones', () => {
    const d = good();
    d.levels.push({ ...good().levels[0], cards: 5, words: ['to', 'two', 'read'] });
    const errors = validateLevels(d).join('\n');
    expect(errors).toMatch(/15 to 30 words/);
    expect(errors).toMatch(/"cards" must be/);
    expect(errors).toMatch(/duplicate id/);
    expect(errors).toMatch(/"to" and "two" sound the same/);
    expect(errors).toMatch(/"read" can be said two ways/);
  });
});

describe('loadLevels', () => {
  it('fetches and normalizes levels', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => raw });
    const loaded = await loadLevels('x', fetchFn);
    expect(loaded).toHaveLength(12);
  });

  it('throws a readable error for broken data', async () => {
    const fetchFn = async () => ({ ok: true, json: async () => ({ levels: [] }) });
    await expect(loadLevels('x', fetchFn)).rejects.toThrow(/levels/);
    const notFound = async () => ({ ok: false, status: 404 });
    await expect(loadLevels('x', notFound)).rejects.toThrow(/404/);
  });
});
