// Stars, shared by every game. Points are never taken away and there is no
// game over: finishing a level always earns at least one star.

export const MAX_STARS = 3;
export const STAR_BONUS = 20;

/** Bonus points for finishing a level, based on its stars. */
export function levelBonus(stars) {
  return stars * STAR_BONUS;
}

/** Keep a star count between 1 (finishing always earns one) and MAX_STARS. */
export function clampStars(stars) {
  const n = Math.round(Number(stars));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_STARS, Math.max(1, n));
}

/**
 * Stars from accuracy. Finishing always earns at least one star.
 * The defaults are the Reading Game's: 3 stars at 85%+, 2 stars at 60%+.
 */
export function accuracyStars(hits, total, { three = 0.85, two = 0.6 } = {}) {
  if (!total) return 1;
  const accuracy = hits / total;
  if (accuracy >= three) return 3;
  if (accuracy >= two) return 2;
  return 1;
}
