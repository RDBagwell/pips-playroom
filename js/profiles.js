// Player profiles: validation and pure operations on the saved record.

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
    unlocked: 1,
    levels: {},
    totalScore: 0,
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

export function resetProfile(record, id) {
  const profile = record.profiles.find((p) => p.id === id);
  if (!profile) return false;
  profile.unlocked = 1;
  profile.levels = {};
  profile.totalScore = 0;
  return true;
}

function starsOf(p) {
  return Object.values(p.levels).reduce((s, r) => s + (r.stars || 0), 0);
}

/** "Best Readers on This Device": top `limit` by total score. */
export function highScores(record, limit = 10) {
  return record.profiles
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.totalScore, stars: starsOf(p) }))
    .sort((a, b) => b.score - a.score || b.stars - a.stars || a.name.localeCompare(b.name))
    .slice(0, limit);
}
