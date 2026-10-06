// Player profiles: validation and pure operations on the saved record.
// A profile is shared by every game; each game's progress lives in
// profile.games[gameId] (see core/progress.js).

import { totalStars } from './progress.js';

export const NAME_MAX = 12;
export const MAX_PROFILES = 6;

export const AVATARS = [
  { id: 'fox', emoji: '🦊', label: 'Fox' },
  { id: 'bear', emoji: '🐻', label: 'Bear' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  { id: 'koala', emoji: '🐨', label: 'Koala' },
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'lion', emoji: '🦁', label: 'Lion' },
  { id: 'frog', emoji: '🐸', label: 'Frog' },
  { id: 'monkey', emoji: '🐵', label: 'Monkey' },
  { id: 'rabbit', emoji: '🐰', label: 'Bunny' },
  { id: 'dog', emoji: '🐶', label: 'Puppy' },
  { id: 'cat', emoji: '🐱', label: 'Kitty' },
  { id: 'penguin', emoji: '🐧', label: 'Penguin' },
  { id: 'turtle', emoji: '🐢', label: 'Turtle' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'octopus', emoji: '🐙', label: 'Octopus' },
  { id: 'chick', emoji: '🐥', label: 'Chick' },
];

export function avatarFor(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

// Letters from any alphabet, spaces, hyphens and apostrophes.
const NAME_RE = /^[\p{L}\p{M}' -]+$/u;

/**
 * Clean up and check a name typed by a child (or a grown-up).
 * Returns { ok: true, name } or { ok: false, error } with a friendly message.
 */
export function validateName(input) {
  const name = String(input ?? '')
    .normalize('NFC')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return { ok: false, error: 'Type a name first.' };
  if ([...name].length > NAME_MAX) return { ok: false, error: `Names can be up to ${NAME_MAX} letters.` };
  if (!NAME_RE.test(name) || !/\p{L}/u.test(name)) {
    return { ok: false, error: "Use letters only. Spaces, - and ' are OK too." };
  }
  return { ok: true, name };
}

function newId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProfile({ name, avatar }, { now = Date.now(), id = newId() } = {}) {
  return {
    id,
    name,
    avatar: avatarFor(avatar).id,
    createdAt: now,
    games: {},
  };
}

function nameTaken(record, name, exceptId = null) {
  const key = name.toLocaleLowerCase();
  return record.profiles.some((p) => p.id !== exceptId && p.name.toLocaleLowerCase() === key);
}

/** Add a profile to the record. Returns { ok, profile } or { ok: false, error }. */
export function addProfile(record, { name, avatar }, opts) {
  if (record.profiles.length >= MAX_PROFILES) {
    return { ok: false, error: `This device already has ${MAX_PROFILES} readers. A grown-up can remove one in settings.` };
  }
  const check = validateName(name);
  if (!check.ok) return check;
  if (nameTaken(record, check.name)) return { ok: false, error: `There's already a reader called ${check.name}.` };
  const profile = createProfile({ name: check.name, avatar }, opts);
  record.profiles.push(profile);
  return { ok: true, profile };
}

export function renameProfile(record, id, newName) {
  const profile = record.profiles.find((p) => p.id === id);
  if (!profile) return { ok: false, error: 'That reader was not found.' };
  const check = validateName(newName);
  if (!check.ok) return check;
  if (nameTaken(record, check.name, id)) return { ok: false, error: `There's already a reader called ${check.name}.` };
  profile.name = check.name;
  return { ok: true, profile };
}

export function deleteProfile(record, id) {
  const before = record.profiles.length;
  record.profiles = record.profiles.filter((p) => p.id !== id);
  if (record.activeProfileId === id) record.activeProfileId = null;
  return record.profiles.length < before;
}

/** Reset one game's progress for a reader, or every game when `gameId` is omitted. */
export function resetProfile(record, id, gameId = null) {
  const profile = record.profiles.find((p) => p.id === id);
  if (!profile) return false;
  if (gameId) delete profile.games[gameId];
  else profile.games = {};
  return true;
}

const ZERO = { totalScore: 0, levels: {} };

/** Score and stars in one game, or across every game when `gameId` is null. */
export function scoreOf(profile, gameId = null) {
  const games = gameId ? [profile.games[gameId] || ZERO] : Object.values(profile.games);
  return {
    score: games.reduce((s, g) => s + (g.totalScore || 0), 0),
    stars: games.reduce((s, g) => s + totalStars(g), 0),
  };
}

/** "Best Readers on This Device": top `limit` by score in one game (or all games). */
export function highScores(record, limit = 10, gameId = null) {
  return record.profiles
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, ...scoreOf(p, gameId) }))
    .sort((a, b) => b.score - a.score || b.stars - a.stars || a.name.localeCompare(b.name))
    .slice(0, limit);
}
