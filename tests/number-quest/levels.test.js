import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateQuestLevels, normalizeQuestLevels, DEFAULT_HINT_AFTER } from '../../games/number-quest/levels.js';
import { optimalGuesses } from '../../games/number-quest/logic.js';

const raw = JSON.parse(readFileSync(new URL('../../data/number-quest/levels.json', import.meta.url), 'utf8'));
const levels = normalizeQuestLevels(raw);

describe('data/number-quest/levels.json', () => {
  it('passes validation', () => {
    expect(validateQuestLevels(raw)).toEqual([]);
  });

  it('has the six ranges in order: 1–5, 1–10, 1–20, 1–30, 1–50, 1–100', () => {
    expect(levels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(levels.map((l) => [l.min, l.max])).toEqual([[1, 5], [1, 10], [1, 20], [1, 30], [1, 50], [1, 100]]);
  });

  it('gives every level a kid-friendly name, a focus for grown-ups and its rounds', () => {
    for (const l of levels) {
      expect(l.name).toMatch(/^[A-Z][A-Za-z ]+$/);
      expect(l.focus.length).toBeGreaterThan(5);
      expect(l.rounds).toBeGreaterThanOrEqual(1);
      expect(l.hintAfter).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(levels.map((l) => l.name)).size).toBe(levels.length);
  });

  it('shows quantities on the low levels and the number pad on the big ones', () => {
    expect(levels.filter((l) => l.dots).map((l) => l.max)).toEqual([5, 10]);
    expect(levels.filter((l) => l.pad).map((l) => l.max)).toEqual([50, 100]);
  });

  it('offers the hint before the best possible guess count runs out on big ranges', () => {
    for (const l of levels) expect(l.hintAfter, l.name).toBeLessThan(optimalGuesses(l.max - l.min + 1));
  });
});

describe('validateQuestLevels', () => {
  const ok = { id: 1, name: 'Test', focus: 'Testing', min: 1, max: 10, rounds: 3 };
  const errorsFor = (lvl) => validateQuestLevels({ levels: [lvl] });

  it('accepts a minimal level and fills defaults', () => {
    expect(errorsFor(ok)).toEqual([]);
    const [n] = normalizeQuestLevels({ levels: [ok] });
    expect(n).toMatchObject({ dots: false, pad: false, hintAfter: DEFAULT_HINT_AFTER, emoji: '🔢' });
  });

  it('names each problem in plain words', () => {
    expect(validateQuestLevels(null)).toEqual(['levels.json must have a non-empty "levels" array']);
    expect(errorsFor({ ...ok, max: undefined }).join()).toMatch(/missing "max"/);
    expect(errorsFor({ ...ok, max: 2 }).join()).toMatch(/at least 3 numbers/);
    expect(errorsFor({ ...ok, min: -1 }).join()).toMatch(/"min"/);
    expect(errorsFor({ ...ok, rounds: 0 }).join()).toMatch(/"rounds"/);
    expect(errorsFor({ ...ok, rounds: 2.5 }).join()).toMatch(/"rounds"/);
    expect(errorsFor({ ...ok, hintAfter: 0 }).join()).toMatch(/"hintAfter"/);
    expect(errorsFor({ ...ok, dots: 'yes' }).join()).toMatch(/"dots"/);
    expect(errorsFor({ ...ok, max: 20, dots: true }).join()).toMatch(/dot pictures/);
    expect(errorsFor({ ...ok, max: 100 }).join()).toMatch(/needs "pad": true/);
    expect(errorsFor({ ...ok, max: 100, pad: true })).toEqual([]);
    expect(validateQuestLevels({ levels: [ok, ok] }).join()).toMatch(/duplicate id/);
    expect(validateQuestLevels({ levels: ['x'] }).join()).toMatch(/must be an object/);
  });
});
