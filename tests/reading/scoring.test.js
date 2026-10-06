import { describe, it, expect } from 'vitest';
import { pointsForAnswer, streakBonus, starsFor, levelBonus } from '../js/scoring.js';

describe('scoring', () => {
  it('awards 10 / 5 / 2 points by attempt', () => {
    expect(pointsForAnswer(1)).toBe(10);
    expect(pointsForAnswer(2)).toBe(5);
    expect(pointsForAnswer(3)).toBe(2);
    expect(pointsForAnswer(9)).toBe(2);
  });

  it('gives a small, capped streak bonus', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 20].map(streakBonus)).toEqual([0, 0, 2, 4, 6, 8, 10, 10, 10]);
  });

  it('awards 1-3 stars from first-try accuracy, never zero', () => {
    expect(starsFor(8, 8)).toBe(3);
    expect(starsFor(7, 8)).toBe(3);
    expect(starsFor(6, 8)).toBe(2);
    expect(starsFor(5, 8)).toBe(2);
    expect(starsFor(4, 8)).toBe(1);
    expect(starsFor(0, 8)).toBe(1);
    expect(starsFor(0, 0)).toBe(1);
  });

  it('gives a level bonus based on stars', () => {
    expect(levelBonus(1)).toBe(20);
    expect(levelBonus(3)).toBe(60);
  });

  it('a perfect level scores the expected total', () => {
    let total = 0;
    for (let streak = 1; streak <= 8; streak += 1) total += pointsForAnswer(1) + streakBonus(streak);
    total += levelBonus(starsFor(8, 8));
    expect(total).toBe(80 + (2 + 4 + 6 + 8 + 10 + 10 + 10) + 60);
  });
});
