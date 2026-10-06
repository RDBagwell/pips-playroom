// Checking Math Garden's level data in data/math-garden/levels.json.

import { SKILLS } from './questions.js';

export const DEFAULT_GOAL = 8;
export const PICTURES = ['always', 'help', 'none'];
export const OBJECTS = ['apple', 'shell', 'star', 'flower', 'bee', 'leaf'];
/** The most objects a picture shows; bigger numbers use tens bars or rows. */
export const MAX_PICTURE = 20;

const isInt = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;

function checkSkill(s, where) {
  const errors = [];
  if (!s || !SKILLS.includes(s.skill)) return [`${where}: "skill" must be one of ${SKILLS.join(', ')}`];
  switch (s.skill) {
    case 'count':
      if (!isInt(s.max, 3, MAX_PICTURE)) errors.push(`${where}: count "max" must be 3 to ${MAX_PICTURE}`);
      break;
    case 'add':
    case 'sub':
      if (!isInt(s.max, 3, MAX_PICTURE)) errors.push(`${where}: ${s.skill} "max" must be 3 to ${MAX_PICTURE}`);
      if (s.min !== undefined && !(isInt(s.min, 2, MAX_PICTURE) && s.min <= s.max)) errors.push(`${where}: "min" must be 2 to "max"`);
      break;
    case 'doubles':
      if (!isInt(s.max, 4, MAX_PICTURE)) errors.push(`${where}: doubles "max" must be 4 to ${MAX_PICTURE}`);
      break;
    case 'bonds':
      if (!isInt(s.total, 3, MAX_PICTURE)) errors.push(`${where}: bonds "total" must be 3 to ${MAX_PICTURE}`);
      break;
    case 'tens':
      if (!isInt(s.max, 30, 100) || s.max % 10) errors.push(`${where}: tens "max" must be a multiple of 10 from 30 to 100`);
      break;
    case 'times':
      if (!Array.isArray(s.tables) || !s.tables.length || !s.tables.every((t) => isInt(t, 1, 10))) errors.push(`${where}: "tables" must list numbers 1 to 10`);
      if (s.upTo !== undefined && !isInt(s.upTo, 2, 10)) errors.push(`${where}: "upTo" must be 2 to 10`);
      break;
    default:
  }
  return errors;
}

/** Returns human-readable problems (empty when the data is fine). */
export function validateMathLevels(data) {
  const errors = [];
  if (!data || !Array.isArray(data.levels) || data.levels.length === 0) return ['levels.json must have a non-empty "levels" array'];
  const ids = new Set();
  data.levels.forEach((lvl, index) => {
    const where = `level #${index + 1}${lvl && lvl.name ? ` (${lvl.name})` : ''}`;
    if (!lvl || typeof lvl !== 'object') {
      errors.push(`${where}: must be an object`);
      return;
    }
    for (const field of ['id', 'name', 'focus', 'skills', 'trueFalse', 'choices']) {
      if (lvl[field] === undefined) errors.push(`${where}: missing "${field}"`);
    }
    if (!isInt(lvl.id, 1, 999)) errors.push(`${where}: "id" must be a positive whole number`);
    if (ids.has(lvl.id)) errors.push(`${where}: duplicate id ${lvl.id}`);
    ids.add(lvl.id);
    if (typeof lvl.trueFalse !== 'number' || lvl.trueFalse < 0 || lvl.trueFalse > 1) errors.push(`${where}: "trueFalse" must be 0 to 1 (the share of ✔/✘ questions)`);
    if (![3, 4].includes(lvl.choices)) errors.push(`${where}: "choices" must be 3 or 4`);
    if (lvl.goal !== undefined && !isInt(lvl.goal, 1, 30)) errors.push(`${where}: "goal" must be 1 to 30`);
    if (lvl.pictures !== undefined && !PICTURES.includes(lvl.pictures)) errors.push(`${where}: "pictures" must be one of ${PICTURES.join(', ')}`);
    if (lvl.object !== undefined && !OBJECTS.includes(lvl.object)) errors.push(`${where}: "object" must be one of ${OBJECTS.join(', ')}`);
    if (!Array.isArray(lvl.skills) || lvl.skills.length === 0) errors.push(`${where}: "skills" must be a non-empty list`);
    else lvl.skills.forEach((s, i) => errors.push(...checkSkill(s, `${where} skill #${i + 1}`)));
  });
  return errors;
}

export function normalizeMathLevels(data) {
  return data.levels
    .map((lvl) => ({ emoji: '🌱', color: '#5CC689', about: '', object: 'apple', pictures: 'always', ...lvl, goal: lvl.goal ?? DEFAULT_GOAL }))
    .sort((a, b) => a.id - b.id);
}
