// Checking Type with Pip's level data in data/typing/levels.json, and linking
// the word levels to the Reading Game's word lists (shared, never copied).

import { onKeyboard } from './keys.js';

export const KINDS = ['letters', 'words', 'sentences'];
export const DEFAULT_GOAL = 8;

const typeable = (text) => typeof text === 'string' && text.length > 0 && [...text].every(onKeyboard);

/** Returns human-readable problems (empty when the data is fine). */
export function validateTypingLevels(data) {
  const errors = [];
  if (!data || !Array.isArray(data.levels) || data.levels.length === 0) return ['levels.json must have a non-empty "levels" array'];
  const ids = new Set();
  data.levels.forEach((lvl, index) => {
    const where = `level #${index + 1}${lvl && lvl.name ? ` (${lvl.name})` : ''}`;
    if (!lvl || typeof lvl !== 'object') {
      errors.push(`${where}: must be an object`);
      return;
    }
    for (const field of ['id', 'name', 'kind']) if (lvl[field] === undefined) errors.push(`${where}: missing "${field}"`);
    if (!Number.isInteger(lvl.id) || lvl.id < 1) errors.push(`${where}: "id" must be a positive whole number`);
    if (ids.has(lvl.id)) errors.push(`${where}: duplicate id ${lvl.id}`);
    ids.add(lvl.id);
    if (!KINDS.includes(lvl.kind)) errors.push(`${where}: "kind" must be one of ${KINDS.join(', ')}`);
    if (lvl.goal !== undefined && (!Number.isInteger(lvl.goal) || lvl.goal < 1 || lvl.goal > 20)) errors.push(`${where}: "goal" must be 1 to 20`);
    if (lvl.canHide !== undefined && typeof lvl.canHide !== 'boolean') errors.push(`${where}: "canHide" must be true or false`);
    if (lvl.kind === 'letters' && !(typeof lvl.letters === 'string' && /^[a-z]{3,}$/.test(lvl.letters))) {
      errors.push(`${where}: "letters" must be at least 3 lowercase letters`);
    }
    if (lvl.kind === 'words') {
      const own = lvl.words !== undefined;
      const shared = lvl.fromReading !== undefined;
      if (own === shared) errors.push(`${where}: give either "words" or "fromReading" (Reading Game level ids)`);
      if (own && (!Array.isArray(lvl.words) || lvl.words.length < 5 || !lvl.words.every(typeable))) {
        errors.push(`${where}: "words" must list at least 5 words made of keys on the keyboard`);
      }
      if (shared && (!Array.isArray(lvl.fromReading) || !lvl.fromReading.length || !lvl.fromReading.every((n) => Number.isInteger(n) && n > 0))) {
        errors.push(`${where}: "fromReading" must list Reading Game level ids`);
      }
      if (!shared && lvl.focus === undefined) errors.push(`${where}: missing "focus"`);
    }
    if (lvl.kind === 'sentences' && (!Array.isArray(lvl.sentences) || lvl.sentences.length < 2 || !lvl.sentences.every(typeable))) {
      errors.push(`${where}: "sentences" must list at least 2 sentences made of keys on the keyboard`);
    }
    if (lvl.kind !== 'words' && lvl.focus === undefined) errors.push(`${where}: missing "focus"`);
  });
  return errors;
}

export function normalizeTypingLevels(data) {
  return data.levels
    .map((lvl) => ({ emoji: '⌨️', color: '#4DB6F0', about: '', canHide: false, ...lvl, goal: lvl.goal ?? DEFAULT_GOAL }))
    .sort((a, b) => a.id - b.id);
}

/**
 * Fill in the word levels that borrow the Reading Game's words, in the
 * Reading Game's own order. Throws if the Reading Game's data isn't there.
 */
export function linkReadingWords(levels, readingLevels) {
  return levels.map((lvl) => {
    if (!lvl.fromReading) return lvl;
    const sources = lvl.fromReading.map((id) => {
      const r = readingLevels.find((l) => l.id === id);
      if (!r) throw new Error(`Type with Pip level ${lvl.id} needs Reading Game level ${id}`);
      return r;
    });
    const words = [...new Set(sources.flatMap((r) => r.words))].filter(typeable);
    return {
      ...lvl,
      words,
      focus: lvl.focus || `Words from the Reading Game: ${sources.map((r) => r.name).join(', ')}`,
      about: lvl.about || `The same words as ${sources.map((r) => `${r.emoji} ${r.name}`).join(' and ')}, so the two games help each other.`,
    };
  });
}

/** What to type in a level: letters, words or sentences. */
export function itemsOf(level) {
  if (level.kind === 'letters') return [...level.letters];
  if (level.kind === 'sentences') return level.sentences;
  return level.words;
}
