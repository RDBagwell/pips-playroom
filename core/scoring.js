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
