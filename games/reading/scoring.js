// Points and stars for the Reading Game. Points are never taken away and
// there is no game over. The shared star helpers live in core/scoring.js.

import { MAX_STARS, STAR_BONUS, levelBonus, accuracyStars } from '../../core/scoring.js';

export { MAX_STARS, STAR_BONUS, levelBonus };

export const POINTS = { firstTry: 10, secondTry: 5, later: 2 };
export const STREAK_STEP = 2;
export const STREAK_CAP = 10;

export function pointsForAnswer(attempts) {
  if (attempts <= 1) return POINTS.firstTry;
  if (attempts === 2) return POINTS.secondTry;
  return POINTS.later;
}

/** Bonus for consecutive first-try answers: +2, +4, ... capped at +10. */
export function streakBonus(streak) {
  if (streak < 2) return 0;
  return Math.min((streak - 1) * STREAK_STEP, STREAK_CAP);
}

/**
 * Stars from first-try accuracy. Finishing always earns at least one star.
 *   3 stars: 85%+ right on the first try (7 of 8)
 *   2 stars: 60%+ (5 of 8)
 */
export function starsFor(firstTry, total) {
  return accuracyStars(firstTry, total, { three: 0.85, two: 0.6 });
}
