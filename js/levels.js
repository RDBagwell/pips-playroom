// Loading and checking the level data in data/levels.json.

import { MODES, HETERONYMS, areHomophones } from './distractors.js';

export const DEFAULT_GOAL = 8;
const WORD_RE = /^([a-z]+|I)$/;

/**
 * Returns a list of human-readable problems (empty when the data is fine).
 * Used by the tests and at runtime, so a typo in levels.json is easy to spot.
 */
export function validateLevels(data) {
  const errors = [];
  if (!data || !Array.isArray(data.levels) || data.levels.length === 0) {
    return ['levels.json must have a non-empty "levels" array'];
  }
  const ids = new Set();
  data.levels.forEach((lvl, index) => {
    const where = `level #${index + 1}${lvl && lvl.name ? ` (${lvl.name})` : ''}`;
    if (!lvl || typeof lvl !== 'object') {
      errors.push(`${where}: must be an object`);
      return;
    }
    for (const field of ['id', 'name', 'focus', 'words', 'cards', 'distractors']) {
      if (lvl[field] === undefined) errors.push(`${where}: missing "${field}"`);
    }
    if (!Number.isInteger(lvl.id) || lvl.id < 1) errors.push(`${where}: "id" must be a positive whole number`);
    if (ids.has(lvl.id)) errors.push(`${where}: duplicate id ${lvl.id}`);
    ids.add(lvl.id);
    if (!MODES.includes(lvl.distractors)) {
      errors.push(`${where}: "distractors" must be one of ${MODES.join(', ')}`);
    }
    if (![3, 4, 6, 9].includes(lvl.cards)) errors.push(`${where}: "cards" must be 3, 4, 6 or 9`);
    if (lvl.goal !== undefined && (!Number.isInteger(lvl.goal) || lvl.goal < 1)) {
      errors.push(`${where}: "goal" must be a positive whole number`);
    }
    if (!Array.isArray(lvl.words)) return;
    if (lvl.words.length < 15 || lvl.words.length > 30) {
      errors.push(`${where}: should have 15 to 30 words (has ${lvl.words.length})`);
    }
    const seen = new Set();
    for (const w of lvl.words) {
      if (typeof w !== 'string' || !WORD_RE.test(w)) {
        errors.push(`${where}: "${w}" must be lowercase letters only (or "I")`);
        continue;
      }
      if (seen.has(w)) errors.push(`${where}: "${w}" is listed twice`);
      seen.add(w);
      if (HETERONYMS.includes(w)) errors.push(`${where}: "${w}" can be said two ways, so it can't be used`);
    }
    if (seen.size < lvl.cards) errors.push(`${where}: needs at least ${lvl.cards} different words`);
  });

  // No two words anywhere in the game may sound the same.
  const all = [...new Set(data.levels.flatMap((l) => (Array.isArray(l.words) ? l.words : [])))];
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      if (areHomophones(all[i], all[j])) errors.push(`"${all[i]}" and "${all[j]}" sound the same`);
    }
  }
  return errors;
}

/** Fill in defaults and sort by id. Assumes validateLevels passed. */
export function normalizeLevels(data) {
  return data.levels
    .map((lvl) => ({
      emoji: '📖',
      color: '#FFC93C',
      about: '',
      ...lvl,
      goal: lvl.goal ?? DEFAULT_GOAL,
      words: lvl.words.slice(),
    }))
    .sort((a, b) => a.id - b.id);
}

/** Words from all levels before `levelId` (used to top up distractors). */
export function earlierWords(levels, levelId) {
  return [...new Set(levels.filter((l) => l.id < levelId).flatMap((l) => l.words))];
}

export async function loadLevels(url = './data/levels.json', fetchFn = globalThis.fetch) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const data = await res.json();
  const errors = validateLevels(data);
  if (errors.length) throw new Error(`levels.json has problems:\n${errors.join('\n')}`);
  return normalizeLevels(data);
}
