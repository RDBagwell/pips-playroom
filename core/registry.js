// The games in the playroom. Each game registers itself once, with one call:
//
//   registerGame({
//     id: 'reading',                     // lowercase letters, digits and dashes
//     title: 'Reading Game',
//     tagline: 'Listen, look, and find the word!',
//     color: '#4DB6F0',                  // the hub card's colour
//     icon: () => svgElement,            // the hub card's picture (built with core/svg.js)
//     data: './data/reading/levels.json',// level data, relative to index.html
//     loadLevels: (json) => levels,      // validate + normalise; throw on bad data
//     start: 'map',                      // the game's first screen
//     screens: { map: render, play: render, ... },
//     settings: { key: { type: 'boolean' | 'enum', default, values? } },  // optional
//     settingsSection: (helpers) => node,// optional, shown in the grown-ups' corner
//     report: (progress, levels) => {...}, // optional, the grown-ups' progress view
//     stylesheet: './games/reading/style.css', // optional
//   });
//
// Screens are registered with the router as `${id}/${name}` (for example
// 'reading/play'), so games never collide with each other or with the hub.

import { register } from './router.js';

const games = new Map();
export const GAME_ID_RE = /^[a-z][a-z0-9-]{0,30}$/;

/** Check a game definition. Returns a list of problems (empty when fine). */
export function validateGame(game) {
  const errors = [];
  if (!game || typeof game !== 'object') return ['a game must be an object'];
  if (typeof game.id !== 'string' || !GAME_ID_RE.test(game.id)) errors.push('"id" must be lowercase letters, digits and dashes');
  for (const field of ['title', 'tagline', 'data', 'start']) {
    if (typeof game[field] !== 'string' || !game[field]) errors.push(`"${field}" must be a non-empty string`);
  }
  if (typeof game.data === 'string' && !game.data.startsWith('./')) errors.push('"data" must be a relative path starting with ./');
  if (typeof game.icon !== 'function') errors.push('"icon" must be a function returning an SVG element');
  if (typeof game.loadLevels !== 'function') errors.push('"loadLevels" must be a function');
  if (!game.screens || typeof game.screens !== 'object') {
    errors.push('"screens" must be an object of render functions');
  } else {
    for (const [name, fn] of Object.entries(game.screens)) {
      if (typeof fn !== 'function') errors.push(`screen "${name}" must be a function`);
    }
    if (typeof game.start === 'string' && typeof game.screens[game.start] !== 'function') {
      errors.push(`"start" screen "${game.start}" is not in "screens"`);
    }
  }
  for (const [key, spec] of Object.entries(game.settings || {})) {
    if (!spec || !['boolean', 'enum'].includes(spec.type)) errors.push(`setting "${key}" needs a type of boolean or enum`);
    else if (spec.type === 'enum' && (!Array.isArray(spec.values) || !spec.values.includes(spec.default))) {
      errors.push(`setting "${key}" must list its values, including the default`);
    } else if (spec.type === 'boolean' && typeof spec.default !== 'boolean') {
      errors.push(`setting "${key}" needs a true/false default`);
    }
  }
  return errors;
}

/** Add a game to the playroom. Throws (with every problem listed) on a bad definition. */
export function registerGame(game) {
  const errors = validateGame(game);
  if (errors.length) throw new Error(`Game "${game && game.id}" is not valid:\n${errors.join('\n')}`);
  if (games.has(game.id)) throw new Error(`A game called "${game.id}" is already registered`);
  const entry = { settings: {}, ...game, levels: [], status: 'loading' };
  games.set(game.id, entry);
  for (const [name, render] of Object.entries(game.screens)) {
    // Game screens are titled "Level 3 · Reading Game" rather than "· Pip's Playroom".
    register(`${game.id}/${name}`, (params) => {
      const shown = render(params);
      if (shown && !shown.redirect && !shown.appTitle) shown.appTitle = game.title;
      return shown;
    });
  }
  return entry;
}

export function getGame(id) {
  return games.get(id) || null;
}

/** All games, in the order they were registered. */
export function allGames() {
  return [...games.values()];
}

/** For tests: forget every game. */
export function clearGames() {
  games.clear();
}

/** Turn a game's settings spec into a clean settings object. */
export function sanitizeGameSettings(spec = {}, raw = {}) {
  const src = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const [key, s] of Object.entries(spec)) {
    const v = src[key];
    if (s.type === 'boolean') out[key] = typeof v === 'boolean' ? v : s.default;
    else out[key] = s.values.includes(v) ? v : s.default;
  }
  return out;
}

/** Default settings for every registered game: { reading: {...}, ... }. */
export function defaultGameSettings() {
  return Object.fromEntries(allGames().map((g) => [g.id, sanitizeGameSettings(g.settings)]));
}

/** Load (and check) each game's level data. A game that fails is marked unavailable; the rest still work. */
export async function loadAllGames(fetchFn = globalThis.fetch) {
  await Promise.all(allGames().map(async (g) => {
    try {
      const res = await fetchFn(g.data);
      if (!res.ok) throw new Error(`Could not load ${g.data} (${res.status})`);
      g.levels = g.loadLevels(await res.json());
      g.status = 'ready';
    } catch (err) {
      console.error(err);
      g.levels = [];
      g.status = 'error';
    }
  }));
  return allGames();
}

/** Start screen name for a game, as the router knows it. */
export function screenName(gameId, name) {
  return `${gameId}/${name}`;
}
