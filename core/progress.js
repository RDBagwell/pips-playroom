// A player's progress through one game's levels. Pure functions over plain
// objects. Each game keeps its own progress record on the profile:
//   profile.games[gameId] = { unlocked, levels: { [id]: { stars, best, plays } },
//                             totalScore, tricky: { [thing]: times }, stats: {} }

import { MAX_STARS } from './scoring.js';

export function freshProgress() {
  return { unlocked: 1, levels: {}, totalScore: 0, tricky: {}, stats: {} };
}

/** This profile's progress in a game, created on first use. */
export function gameProgress(profile, gameId) {
  if (!profile.games[gameId]) profile.games[gameId] = freshProgress();
  return profile.games[gameId];
}

/** Read-only view: progress if any, without creating it. */
export function peekProgress(profile, gameId) {
  return profile.games[gameId] || freshProgress();
}

/** Stars across every game. */
export function allStars(profile) {
  return Object.values(profile.games).reduce((sum, g) => sum + totalStars(g), 0);
}

/** Count something the player found tricky (a missed word, a number mix-up). */
export function noteTricky(progress, key, max = 40) {
  if (!progress.tricky) progress.tricky = {};
  progress.tricky[key] = (progress.tricky[key] || 0) + 1;
  const keys = Object.keys(progress.tricky);
  if (keys.length > max) {
    // Forget the least-missed thing so the list stays short.
    const [least] = keys.sort((a, b) => progress.tricky[a] - progress.tricky[b]);
    delete progress.tricky[least];
  }
}

/** The trickiest things first: [[key, times], ...]. */
export function trickiest(progress, limit = 8) {
  return Object.entries(progress.tricky || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

/** Add to a counter in progress.stats. */
export function addStat(progress, key, n = 1) {
  if (!progress.stats) progress.stats = {};
  progress.stats[key] = (progress.stats[key] || 0) + n;
}

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
