// A player's progress through the levels. Pure functions over plain objects.

import { MAX_STARS } from './scoring.js';

export function levelRecord(profile, levelId) {
  return profile.levels[levelId] || { stars: 0, best: 0, plays: 0 };
}

export function isUnlocked(profile, levelId, { unlockAll = false } = {}) {
  return unlockAll || levelId <= profile.unlocked;
}

export function totalStars(profile) {
  return Object.values(profile.levels).reduce((sum, r) => sum + (r.stars || 0), 0);
}

/**
 * Record a finished level. Returns what changed so the celebration screen can
 * say "New best!". Mutates and returns `profile`.
 */
export function applyLevelResult(profile, level, { score, stars }, levelCount) {
  const before = levelRecord(profile, level.id);
  const after = {
    stars: Math.min(MAX_STARS, Math.max(before.stars, stars)),
    best: Math.max(before.best, score),
    plays: before.plays + 1,
  };
  profile.levels[level.id] = after;
  profile.totalScore += score;
  const nextId = level.id + 1;
  const unlockedNext = nextId <= levelCount && profile.unlocked < nextId;
  if (unlockedNext) profile.unlocked = nextId;
  return {
    newBest: before.plays > 0 && score > before.best,
    firstClear: before.plays === 0,
    moreStars: after.stars > before.stars && before.plays > 0,
    unlockedNext,
  };
}
