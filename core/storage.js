// Everything the game remembers lives in ONE versioned localStorage record on
// this device. Nothing is ever sent anywhere.
//
// Storage can be unavailable (private browsing, blocked site data) and saved
// data can be damaged. In both cases the game keeps working: it just doesn't
// save, or starts fresh with a gentle message. It never crashes.

import { DEFAULT_RATE, clampRate } from './speech.js';
import { AVATARS, MAX_PROFILES, validateName } from './profiles.js';
import { MAX_STARS } from './scoring.js';

export const STORAGE_KEY = 'reading-game';
export const BACKUP_KEY = 'reading-game-unreadable-backup';
export const SCHEMA_VERSION = 1;

/**
 * Migrations from one schema version to the next. When the saved shape
 * changes, bump SCHEMA_VERSION and add a step here, for example:
 *   1: (r) => ({ ...r, version: 2, settings: { ...r.settings, newThing: true } }),
 * Each step receives a version-N record and returns a version-(N+1) record.
 */
export const MIGRATIONS = {};

export function defaultSettings() {
  return { voiceURI: null, rate: DEFAULT_RATE, sfx: true, wordCase: 'lower', unlockAll: false };
}

export function freshRecord() {
  return { version: SCHEMA_VERSION, settings: defaultSettings(), profiles: [], activeProfileId: null };
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

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const intIn = (x, min, max, fallback) => (Number.isInteger(x) && x >= min && x <= max ? x : fallback);

function sanitizeSettings(s) {
  const d = defaultSettings();
  if (!isObj(s)) return d;
  return {
    voiceURI: typeof s.voiceURI === 'string' && s.voiceURI.length < 500 ? s.voiceURI : null,
    rate: typeof s.rate === 'number' ? clampRate(s.rate) : d.rate,
    sfx: typeof s.sfx === 'boolean' ? s.sfx : d.sfx,
    wordCase: s.wordCase === 'title' ? 'title' : 'lower',
    unlockAll: s.unlockAll === true,
  };
}

function sanitizeProfile(p) {
  if (!isObj(p) || typeof p.id !== 'string' || !p.id || p.id.length > 100) return null;
  const name = validateName(p.name);
  if (!name.ok) return null;
  const levels = {};
  if (isObj(p.levels)) {
    for (const [key, rec] of Object.entries(p.levels)) {
      if (!/^\d{1,3}$/.test(key) || !isObj(rec)) continue;
      levels[key] = {
        stars: intIn(rec.stars, 0, MAX_STARS, 0),
        best: intIn(rec.best, 0, 1e7, 0),
        plays: intIn(rec.plays, 0, 1e6, 0),
      };
    }
  }
  return {
    id: p.id,
    name: name.name,
    avatar: AVATARS.some((a) => a.id === p.avatar) ? p.avatar : AVATARS[0].id,
    createdAt: intIn(p.createdAt, 0, 8.64e15, 0),
    unlocked: intIn(p.unlocked, 1, 999, 1),
    levels,
    totalScore: intIn(p.totalScore, 0, 1e9, 0),
  };
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
    record: { version: SCHEMA_VERSION, settings: sanitizeSettings(raw.settings), profiles, activeProfileId: active },
    dropped,
  };
}

/** Get localStorage without throwing (even touching it can throw when blocked). */
export function getBrowserStorage(win = globalThis) {
  try {
    const s = win.localStorage;
    const probe = '__reading-game-probe__';
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
export function createStore(storage, { migrations = MIGRATIONS } = {}) {
  const available = Boolean(storage);

  /**
   * status: 'new'         nothing saved yet
   *         'ok'          loaded
   *         'repaired'    loaded, but some unreadable profiles were skipped
   *         'corrupt'     couldn't read it; starting fresh (old data backed up)
   *         'unavailable' storage is blocked; playing without saving
   */
  function load() {
    if (!available) return { record: freshRecord(), status: 'unavailable' };
    let text;
    try {
      text = storage.getItem(STORAGE_KEY);
    } catch {
      return { record: freshRecord(), status: 'unavailable' };
    }
    if (text === null || text === undefined) return { record: freshRecord(), status: 'new' };
    try {
      const migrated = migrate(JSON.parse(text), migrations);
      const result = sanitizeRecord(migrated);
      if (!result) throw new Error('Invalid record');
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

  return { available, load, save };
}
