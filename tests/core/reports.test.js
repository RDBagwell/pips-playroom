// The grown-ups' progress view for all four games: each turns what a child
// found tricky into something a parent can act on.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { reading } from '../../games/reading/game.js';
import { numberQuest } from '../../games/number-quest/game.js';
import { mathGarden } from '../../games/math-garden/game.js';
import { typing } from '../../games/typing/game.js';
import { freshProgress, noteTricky, applyLevelResult } from '../../core/progress.js';

const levels = (game, id) => game.loadLevels(JSON.parse(readFileSync(`${process.cwd()}/data/${id}/levels.json`, 'utf8')));
const progressWith = (tricky, stats = {}) => {
  const p = freshProgress();
  for (const [k, n] of Object.entries(tricky)) for (let i = 0; i < n; i += 1) noteTricky(p, k);
  p.stats = stats;
  return p;
};

describe('progress reports', () => {
  it('Reading Game: missed words', () => {
    const lv = levels(reading, 'reading');
    const p = progressWith({ ship: 3, chip: 1 });
    applyLevelResult(p, lv[0], { score: 100, stars: 2 }, lv.length);
    const r = reading.report(p, lv);
    expect(r.trickyTitle).toBe('Words to practise');
    expect(r.tricky).toEqual([{ label: 'ship', detail: 'missed 3 times' }, { label: 'chip', detail: 'missed 1 time' }]);
    expect(r.summary[0]).toEqual(['Levels completed', '1 of 12']);
  });

  it('Number Quest: number ranges', () => {
    const r = numberQuest.report(progressWith({ '24|27': 2, '68|72': 1 }, { rounds: 4, guesses: 14, best: 20, splitChances: 10, goodSplits: 7, mixups: 3 }), levels(numberQuest, 'number-quest'));
    expect(r.trickyTitle).toBe('Number ranges to practise');
    expect(r.tricky[0]).toEqual({ label: 'Numbers 20–29', detail: 'mixed up 2 times, e.g. 24 and 27' });
    expect(r.skills.map((s) => s.label)).toContain('Starting in the middle:');
  });

  it('Math Garden: fact families', () => {
    const r = mathGarden.report(progressWith({ '3+4=7': 2, '2×5=10': 1 }, { questions: 20, firstTry: 15, time1: 834 }), levels(mathGarden, 'math-garden'));
    expect(r.trickyTitle).toBe('Fact families to practise');
    expect(r.tricky).toEqual([
      { label: '3 + 4 = 7  ·  7 − 4 = 3', detail: 'missed 2 times' },
      { label: '2 × 5 = 10  ·  5 × 2 = 10', detail: 'missed 1 time' },
    ]);
    expect(r.skills).toContainEqual({ label: 'First-try answers:', detail: '75% of 20 questions.' });
    expect(r.skills.find((s) => s.label.startsWith('Best times')).detail).toBe('Apple Orchard 1:23.4');
  });

  it('Type with Pip: letters and keys, with the finger to use', () => {
    const lv = levels(typing, 'typing').map((l) => ({ ...l, words: l.words || ['cat'] }));
    const r = typing.report(progressWith({ b: 3, space: 1 }, { keys: 90, wrongKeys: 10, bestWpm: 9 }), lv);
    expect(r.trickyTitle).toBe('Keys to practise');
    expect(r.tricky).toEqual([
      { label: 'b', detail: 'missed 3 times · left pointer finger' },
      { label: 'space', detail: 'missed 1 time · thumb' },
    ]);
    expect(r.skills).toContainEqual({ label: 'Right keys:', detail: '90% of 100 key presses.' });
  });

  it('every report says something when nothing is tricky yet', () => {
    for (const [g, id] of [[reading, 'reading'], [numberQuest, 'number-quest'], [mathGarden, 'math-garden']]) {
      const r = g.report(freshProgress(), levels(g, id));
      expect(r.tricky).toEqual([]);
      expect(r.levels.every((l) => l.plays === 0)).toBe(true);
    }
  });
});
