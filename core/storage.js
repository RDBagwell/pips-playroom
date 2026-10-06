// Everything the playroom remembers lives in ONE versioned localStorage record
// on this device. Nothing is ever sent anywhere.
//
// Storage can be unavailable (private browsing, blocked site data) and saved
// data can be damaged. In both cases the playroom keeps working: it just
// doesn't save, or starts fresh with a gentle message. It never crashes.
//
// Version history:
//   1  the Reading Game's record, saved under "reading-game"
//   2  the playroom record, saved under "pips-playroom": progress is per game
//
// Players of the old Reading Game keep their progress: the first time the
// playroom loads on a device that has a "reading-game" record and no
// "pips-playroom" record, it reads the old record (as untrusted input),
// migrates it from version 1 and notes the import. The old record is left
// exactly as it was.

import { DEFAULT_RATE, clampRate } from './speech.js';
import { AVATARS, MAX_PROFILES, validateName } from './profiles.js';
import { MAX_STARS } from './scoring.js';
import { GAME_ID_RE, allGames, defaultGameSettings, sanitizeGameSettings } from './registry.js';

export const STORAGE_KEY = 'pips-playroom';
export const BACKUP_KEY = 'pips-playroom-unreadable-backup';
export const LEGACY_KEY = 'reading-game';
export const SCHEMA_VERSION = 2;

/** Limits that keep a damaged or hostile record from growing without bound. */
export const MAX_TRICKY = 40;
export const MAX_STATS = 40;
export const MAX_IMPORTS = 10;

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const intIn = (x, min, max, fallback) => (Number.isInteger(x) && x >= min && x <= max ? x : fallback);

/**
 * Migrations from one schema version to the next. When the saved shape
 * changes, bump SCHEMA_VERSION and add a step here. Each step receives a
 * version-N record and returns a version-(N+1) record. Steps run on data
 * read from storage, so they must not trust it: the record is sanitized
 * after the last step.
 */
export const MIGRATIONS = {
  // The Reading Game (v1) kept one game's progress on each profile, and its
  // word case and unlock settings at the top level. Move both under "reading".
  1: (r) => {
    if (!Array.isArray(r.profiles)) throw new Error('Version 1 record has no profiles');
    const s = isObj(r.settings) ? r.settings : {};
    return {
      version: 2,
      settings: {
        voiceURI: s.voiceURI,
        rate: s.rate,
        sfx: s.sfx,
        hiddenGames: [],
        games: { reading: { wordCase: s.wordCase, unlockAll: s.unlockAll } },
      },
      profiles: r.profiles.map((p) => (isObj(p)
        ? {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          createdAt: p.createdAt,
          games: { reading: { unlocked: p.unlocked, levels: p.levels, totalScore: p.totalScore } },
        }
        : p)),
      activeProfileId: r.activeProfileId,
      imports: [],
    };
  },
};

export function defaultSettings() {
  return { voiceURI: null, rate: DEFAULT_RATE, sfx: true, hiddenGames: [], games: defaultGameSettings() };
}

export function freshRecord() {
  return { version: SCHEMA_VERSION, settings: defaultSettings(), profiles: [], activeProfileId: null, imports: [] };
}

/** Bring an older record up to `target`. Throws if it can't. */
export function migrate(record, migrations = MIGRATIONS, target = SCHEMA_VERSION) {
  let r = record;
  let v = r.version;
  if (!Number.isInteger(v) || v < 0) throw new Error('Record has no valid version');
  if (v > target) throw new Error(`Record is from a newer version (${v})`);
  while (v < target) {
    const step = migrations[v];
    if (typeof step !== 'function') throw new Error(`No migration from version ${v}`);
    r = step(r);
    if (!r || r.version !== v + 1) throw new Error(`Migration from version ${v} did not produce version ${v + 1}`);
    v = r.version;
  }
  return r;
}

function sanitizeSettings(s) {
  const d = defaultSettings();
  if (!isObj(s)) return d;
  const games = isObj(s.games) ? s.games : {};
  const hidden = Array.isArray(s.hiddenGames) ? s.hiddenGames.filter((id) => typeof id === 'string' && GAME_ID_RE.test(id)) : [];
  return {
    voiceURI: typeof s.voiceURI === 'string' && s.voiceURI.length < 500 ? s.voiceURI : null,
    rate: typeof s.rate === 'number' ? clampRate(s.rate) : d.rate,
    sfx: typeof s.sfx === 'boolean' ? s.sfx : d.sfx,
    hiddenGames: [...new Set(hidden)].slice(0, 20),
    games: Object.fromEntries(allGames().map((g) => [g.id, sanitizeGameSettings(g.settings, games[g.id])])),
  };
}

/** Keep the `limit` entries with the biggest counts. */
function topCounts(obj, keyRe, limit, max) {
  if (!isObj(obj)) return {};
  const entries = Object.entries(obj)
    .filter(([k, v]) => keyRe.test(k) && Number.isInteger(v) && v >= 1 && v <= max)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  return Object.fromEntries(entries);
}

/** One game's progress for one player. The same shape for every game. */
export function sanitizeProgress(g) {
  const src = isObj(g) ? g : {};
  const levels = {};
  if (isObj(src.levels)) {
    for (const [key, rec] of Object.entries(src.levels)) {
      if (!/^\d{1,3}$/.test(key) || !isObj(rec)) continue;
      levels[key] = {
        stars: intIn(rec.stars, 0, MAX_STARS, 0),
        best: intIn(rec.best, 0, 1e7, 0),
        plays: intIn(rec.plays, 0, 1e6, 0),
      };
    }
  }
  const stats = {};
  if (isObj(src.stats)) {
    for (const [k, v] of Object.entries(src.stats)) {
      if (Object.keys(stats).length >= MAX_STATS) break;
      if (/^[a-zA-Z]{1,30}$/.test(k) && Number.isInteger(v) && v >= 0 && v <= 1e9) stats[k] = v;
    }
  }
  return {
    unlocked: intIn(src.unlocked, 1, 999, 1),
    levels,
    totalScore: intIn(src.totalScore, 0, 1e9, 0),
    // Things this player found tricky (missed words, mixed-up numbers): key → times.
    tricky: topCounts(src.tricky, /^[\p{L}\p{N}' |<>+×=,.-]{1,40}$/u, MAX_TRICKY, 1e6),
    stats,
  };
}

function sanitizeProfile(p) {
  if (!isObj(p) || typeof p.id !== 'string' || !p.id || p.id.length > 100) return null;
  const name = validateName(p.name);
  if (!name.ok) return null;
  const games = {};
  if (isObj(p.games)) {
    for (const [id, g] of Object.entries(p.games)) {
      // Unknown game ids are kept (a game may come back), as long as they look like ids.
      if (GAME_ID_RE.test(id) && isObj(g) && Object.keys(games).length < 20) games[id] = sanitizeProgress(g);
    }
  }
  return {
    id: p.id,
    name: name.name,
    avatar: AVATARS.some((a) => a.id === p.avatar) ? p.avatar : AVATARS[0].id,
    createdAt: intIn(p.createdAt, 0, 8.64e15, 0),
    games,
  };
}

function sanitizeImports(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(isObj).slice(-MAX_IMPORTS).map((i) => ({
    from: i.from === LEGACY_KEY ? LEGACY_KEY : 'unknown',
    at: intIn(i.at, 0, 8.64e15, 0),
    status: ['imported', 'unreadable'].includes(i.status) ? i.status : 'imported',
    profiles: intIn(i.profiles, 0, 1000, 0),
    dropped: intIn(i.dropped, 0, 1e6, 0),
  }));
}

/**
 * Check a record loaded from storage. Returns
 *   { record, dropped }  where dropped counts unreadable profiles, or
 *   null                 when the record as a whole can't be used.
 */
export function sanitizeRecord(raw) {
  if (!isObj(raw) || raw.version !== SCHEMA_VERSION || !Array.isArray(raw.profiles)) return null;
  const seen = new Set();
  const profiles = [];
  let dropped = 0;
  for (const p of raw.profiles) {
    const clean = sanitizeProfile(p);
    if (!clean || seen.has(clean.id) || profiles.length >= MAX_PROFILES) {
      dropped += 1;
      continue;
    }
    seen.add(clean.id);
    profiles.push(clean);
  }
  const active = profiles.some((p) => p.id === raw.activeProfileId) ? raw.activeProfileId : null;
  return {
    record: {
      version: SCHEMA_VERSION,
      settings: sanitizeSettings(raw.settings),
      profiles,
      activeProfileId: active,
      imports: sanitizeImports(raw.imports),
    },
    dropped,
  };
}

/** Parse, migrate and check stored text. Throws when it can't be used. */
export function readRecord(text, migrations = MIGRATIONS) {
  const result = sanitizeRecord(migrate(JSON.parse(text), migrations));
  if (!result) throw new Error('Invalid record');
  return result;
}

/**
 * Turn the old Reading Game's saved text into a playroom record.
 * Always returns a record: when the old data can't be read, a fresh one that
 * notes the attempt (so it isn't retried on every load).
 */
export function importLegacy(text, { now = Date.now(), migrations = MIGRATIONS } = {}) {
  try {
    const raw = JSON.parse(text);
    // Only a version-1 Reading Game record is accepted from the old key.
    if (!isObj(raw) || raw.version !== 1) throw new Error('Not a Reading Game record');
    const { record, dropped } = readRecord(text, migrations);
    record.activeProfileId = null; // let the child choose who's playing
    record.imports.push({ from: LEGACY_KEY, at: now, status: 'imported', profiles: record.profiles.length, dropped });
    return { record, status: dropped ? 'imported-repaired' : 'imported' };
  } catch {
    const record = freshRecord();
    record.imports.push({ from: LEGACY_KEY, at: now, status: 'unreadable', profiles: 0, dropped: 0 });
    return { record, status: 'import-failed' };
  }
}

/** Get localStorage without throwing (even touching it can throw when blocked). */
export function getBrowserStorage(win = globalThis) {
  try {
    const s = win.localStorage;
    const probe = '__pips-playroom-probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/**
 * @param storage something with getItem/setItem (localStorage), or null when unavailable
 */
export function createStore(storage, { migrations = MIGRATIONS, now = () => Date.now() } = {}) {
  const available = Boolean(storage);

  /** Returns true when saved. Never throws. */
  function save(record) {
    if (!available) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * status: 'new'               nothing saved yet
   *         'ok'                loaded
   *         'repaired'          loaded, but some unreadable profiles were skipped
   *         'corrupt'           couldn't read it; starting fresh (old data backed up)
   *         'unavailable'       storage is blocked; playing without saving
   *         'imported'          first visit: brought the Reading Game's players over
   *         'imported-repaired' the same, but some old players couldn't be read
   *         'import-failed'     there was an old Reading Game record we couldn't read
   */
  function load() {
    if (!available) return { record: freshRecord(), status: 'unavailable' };
    let text;
    let legacy = null;
    try {
      text = storage.getItem(STORAGE_KEY);
      if (text === null || text === undefined) legacy = storage.getItem(LEGACY_KEY);
    } catch {
      return { record: freshRecord(), status: 'unavailable' };
    }
    if (text === null || text === undefined) {
      if (legacy === null || legacy === undefined) return { record: freshRecord(), status: 'new' };
      // The old record is only read, never changed or removed.
      const imported = importLegacy(legacy, { now: now(), migrations });
      save(imported.record); // remember that the import happened
      return imported;
    }
    try {
      const result = readRecord(text, migrations);
      return { record: result.record, status: result.dropped ? 'repaired' : 'ok' };
    } catch {
      try {
        storage.setItem(BACKUP_KEY, text);
      } catch {
        /* nothing more we can do */
      }
      return { record: freshRecord(), status: 'corrupt' };
    }
  }

  return { available, load, save };
}
