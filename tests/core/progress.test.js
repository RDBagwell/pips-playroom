import { describe, it, expect } from 'vitest';
import { applyLevelResult, isUnlocked, totalStars, levelRecord } from '../js/progress.js';

const fresh = () => ({ unlocked: 1, levels: {}, totalScore: 0 });
const level = (id) => ({ id });

describe('progress', () => {
  it('starts with only level 1 unlocked', () => {
    const p = fresh();
    expect(isUnlocked(p, 1)).toBe(true);
    expect(isUnlocked(p, 2)).toBe(false);
    expect(isUnlocked(p, 12, { unlockAll: true })).toBe(true);
  });

  it('finishing a level unlocks the next and records stars and score', () => {
    const p = fresh();
    const r = applyLevelResult(p, level(1), { score: 100, stars: 2 }, 12);
    expect(r).toMatchObject({ unlockedNext: true, firstClear: true, newBest: false });
    expect(p.unlocked).toBe(2);
    expect(levelRecord(p, 1)).toEqual({ stars: 2, best: 100, plays: 1 });
    expect(p.totalScore).toBe(100);
  });

  it('replaying keeps the best stars and score and reports a new best', () => {
    const p = fresh();
    applyLevelResult(p, level(1), { score: 100, stars: 2 }, 12);
    const worse = applyLevelResult(p, level(1), { score: 50, stars: 1 }, 12);
    expect(worse.newBest).toBe(false);
    expect(levelRecord(p, 1)).toMatchObject({ stars: 2, best: 100, plays: 2 });
    const better = applyLevelResult(p, level(1), { score: 150, stars: 3 }, 12);
    expect(better).toMatchObject({ newBest: true, moreStars: true, unlockedNext: false });
    expect(p.totalScore).toBe(300);
    expect(totalStars(p)).toBe(3);
  });

  it('does not unlock past the last level', () => {
    const p = { unlocked: 12, levels: {}, totalScore: 0 };
    expect(applyLevelResult(p, level(12), { score: 10, stars: 1 }, 12).unlockedNext).toBe(false);
    expect(p.unlocked).toBe(12);
  });
});
