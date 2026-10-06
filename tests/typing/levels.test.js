import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateTypingLevels, normalizeTypingLevels, linkReadingWords, itemsOf } from '../../games/typing/levels.js';
import { normalizeLevels } from '../../games/reading/levels.js';
import { HOMOPHONES } from '../../games/reading/distractors.js';
import { onKeyboard } from '../../games/typing/keys.js';
import { applyLevelResult, isUnlocked, freshProgress } from '../../core/progress.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../../data/${p}`, import.meta.url), 'utf8'));
const raw = read('typing/levels.json');
const readingLevels = normalizeLevels(read('reading/levels.json'));
const levels = linkReadingWords(normalizeTypingLevels(raw), readingLevels);

describe('data/typing/levels.json', () => {
  it('passes validation', () => {
    expect(validateTypingLevels(raw)).toEqual([]);
  });

  it('climbs from letters to words to sentences', () => {
    expect(levels.map((l) => l.kind)).toEqual(['letters', 'letters', 'letters', 'words', 'words', 'words', 'words', 'words', 'words', 'words', 'sentences']);
    expect(levels[0].letters).toBe('asdfjkl'); // the home row first
    expect(levels[3].words.every((w) => w.length >= 2 && w.length <= 3)).toBe(true);
  });

  it('has only things that can be typed on the keyboard picture', () => {
    for (const l of levels) for (const item of itemsOf(l)) expect([...item].every(onKeyboard), `${l.name}: ${item}`).toBe(true);
  });
});

describe('sharing the Reading Game’s words', () => {
  it('takes them from the Reading Game’s data instead of copying them', () => {
    const shared = raw.levels.filter((l) => l.fromReading);
    expect(shared.length).toBeGreaterThan(0);
    for (const l of shared) expect(l.words, l.name).toBeUndefined();
  });

  it('uses every Reading Game level, in the Reading Game’s order', () => {
    const ids = raw.levels.filter((l) => l.fromReading).flatMap((l) => l.fromReading);
    expect(ids).toEqual(readingLevels.map((l) => l.id));
  });

  it('gives each word level exactly the Reading Game’s words', () => {
    for (const l of levels.filter((x) => x.fromReading)) {
      const expected = [...new Set(l.fromReading.flatMap((id) => readingLevels.find((r) => r.id === id).words))];
      expect(l.words, l.name).toEqual(expected);
      expect(l.focus).toMatch(/Words from the Reading Game/);
    }
  });

  it('follows a change to the Reading Game’s words', () => {
    const changed = readingLevels.map((r) => (r.id === 1 ? { ...r, words: ['zip', 'zap'] } : r));
    const linked = linkReadingWords(normalizeTypingLevels(raw), changed);
    expect(linked.find((l) => l.fromReading?.[0] === 1).words).toEqual(['zip', 'zap']);
  });

  it('refuses to start without the Reading Game’s data', () => {
    expect(() => linkReadingWords(normalizeTypingLevels(raw), [])).toThrow(/needs Reading Game level/);
  });

  it('never asks to spell a word by ear that sounds like another', () => {
    const groups = HOMOPHONES.filter((g) => g.length > 1);
    for (const l of levels.filter((x) => x.canHide)) {
      for (const w of l.words) {
        const group = groups.find((g) => g.includes(w));
        if (group) expect(group.filter((x) => l.words.includes(x)), `${l.name}: ${w}`).toEqual([w]);
      }
    }
  });
});

describe('level progression', () => {
  it('opens the next level when one is finished', () => {
    const p = freshProgress();
    expect(isUnlocked(p, 2)).toBe(false);
    applyLevelResult(p, levels[0], { score: 50, stars: 1 }, levels.length);
    expect(isUnlocked(p, 2)).toBe(true);
    expect(isUnlocked(p, 3)).toBe(false);
  });
});

describe('validateTypingLevels', () => {
  const errs = (lvl) => validateTypingLevels({ levels: [lvl] }).join('\n');
  it('names problems in plain words', () => {
    expect(errs({ id: 1, name: 'L', kind: 'letters', letters: 'ab', focus: 'f' })).toMatch(/"letters"/);
    expect(errs({ id: 1, name: 'W', kind: 'words', focus: 'f' })).toMatch(/either "words" or "fromReading"/);
    expect(errs({ id: 1, name: 'W', kind: 'words', words: ['a'], fromReading: [1] })).toMatch(/either/);
    expect(errs({ id: 1, name: 'W', kind: 'words', words: ['ok!', 'b', 'c', 'd', 'e'], focus: 'f' })).toMatch(/keys on the keyboard/);
    expect(errs({ id: 1, name: 'S', kind: 'sentences', sentences: ['hi'], focus: 'f' })).toMatch(/"sentences"/);
    expect(errs({ id: 1, name: 'X', kind: 'poems', focus: 'f' })).toMatch(/"kind"/);
    expect(errs({ id: 1, name: 'W', kind: 'words', fromReading: ['one'] })).toMatch(/"fromReading"/);
  });
});
