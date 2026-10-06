// Shared state for the running playroom. Screens read and update it.

import { getGame, allGames, sanitizeGameSettings } from './registry.js';
import { gameProgress } from './progress.js';

export const ctx = {
  speech: null, // from speech.js
  sfx: null, // from sfx.js
  store: null, // from storage.js
  record: null, // the saved record: { version, settings, profiles, activeProfileId, imports }
  notice: null, // a gentle one-time message for the next screen
};

export function settings() {
  return ctx.record.settings;
}

/** One game's settings (always complete: defaults fill any gaps). */
export function gameSettings(gameId) {
  const s = ctx.record.settings;
  const game = getGame(gameId);
  if (!s.games) s.games = {};
  if (!s.games[gameId]) s.games[gameId] = sanitizeGameSettings(game ? game.settings : {}, {});
  return s.games[gameId];
}

/** A game's levels (an empty list until its data has loaded). */
export function levelsOf(gameId) {
  const game = getGame(gameId);
  return game ? game.levels : [];
}

/** Games the grown-ups have left switched on, in hub order. */
export function visibleGames() {
  const hidden = new Set(ctx.record.settings.hiddenGames || []);
  return allGames().filter((g) => !hidden.has(g.id));
}

export function isGameVisible(gameId) {
  return !(ctx.record.settings.hiddenGames || []).includes(gameId);
}

export function activeProfile() {
  const { record } = ctx;
  return record.profiles.find((p) => p.id === record.activeProfileId) || null;
}

/** The active player's progress in a game (created on first use). */
export function activeProgress(gameId) {
  const profile = activeProfile();
  return profile ? gameProgress(profile, gameId) : null;
}

/** Save the record. Returns false when storage is unavailable (that's fine). */
export function save() {
  return ctx.store ? ctx.store.save(ctx.record) : false;
}

/** Take the pending notice, if any (shown once). */
export function takeNotice() {
  const n = ctx.notice;
  ctx.notice = null;
  return n;
}

export function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
