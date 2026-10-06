// Checking Number Quest's level data in data/number-quest/levels.json.

export const DEFAULT_HINT_AFTER = 3;
export const MAX_TILES = 30; // above this, the number pad is used instead of tiles
export const MAX_DOTS = 10;

/**
 * Returns a list of human-readable problems (empty when the data is fine).
 * Used by the tests and at runtime, so a typo in levels.json is easy to spot.
 */
export function validateQuestLevels(data) {
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
    for (const field of ['id', 'name', 'focus', 'min', 'max', 'rounds']) {
      if (lvl[field] === undefined) errors.push(`${where}: missing "${field}"`);
    }
    if (!Number.isInteger(lvl.id) || lvl.id < 1) errors.push(`${where}: "id" must be a positive whole number`);
    if (ids.has(lvl.id)) errors.push(`${where}: duplicate id ${lvl.id}`);
    ids.add(lvl.id);
    if (typeof lvl.name !== 'string' || !lvl.name.trim()) errors.push(`${where}: "name" must be text`);
    if (!Number.isInteger(lvl.min) || lvl.min < 0) errors.push(`${where}: "min" must be a whole number, 0 or more`);
    if (!Number.isInteger(lvl.max) || lvl.max > 1000) errors.push(`${where}: "max" must be a whole number up to 1000`);
    if (Number.isInteger(lvl.min) && Number.isInteger(lvl.max) && lvl.max - lvl.min < 2) {
      errors.push(`${where}: the range must have at least 3 numbers`);
    }
    if (!Number.isInteger(lvl.rounds) || lvl.rounds < 1 || lvl.rounds > 10) errors.push(`${where}: "rounds" must be 1 to 10`);
    if (lvl.hintAfter !== undefined && (!Number.isInteger(lvl.hintAfter) || lvl.hintAfter < 1)) {
      errors.push(`${where}: "hintAfter" must be a positive whole number`);
    }
    for (const flag of ['dots', 'pad']) {
      if (lvl[flag] !== undefined && typeof lvl[flag] !== 'boolean') errors.push(`${where}: "${flag}" must be true or false`);
    }
    if (lvl.dots && lvl.max > MAX_DOTS) errors.push(`${where}: dot pictures only work up to ${MAX_DOTS}`);
    if (!lvl.pad && Number.isInteger(lvl.max) && Number.isInteger(lvl.min) && lvl.max - lvl.min + 1 > MAX_TILES) {
      errors.push(`${where}: more than ${MAX_TILES} numbers needs "pad": true (tiles would be too small to tap)`);
    }
  });
  return errors;
}

/** Fill in defaults and sort by id. Assumes validateQuestLevels passed. */
export function normalizeQuestLevels(data) {
  return data.levels
    .map((lvl) => ({
      emoji: '🔢',
      color: '#FFC93C',
      about: '',
      ...lvl,
      dots: lvl.dots === true,
      pad: lvl.pad === true,
      hintAfter: lvl.hintAfter ?? DEFAULT_HINT_AFTER,
    }))
    .sort((a, b) => a.id - b.id);
}
