// Carrying the Reading Game's players into the playroom: the old record under
// "reading-game" is read once, as untrusted input, and never changed.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import '../../games/index.js';
import {
  createStore, importLegacy, migrate, MIGRATIONS, STORAGE_KEY, LEGACY_KEY, BACKUP_KEY, SCHEMA_VERSION,
} from '../../core/storage.js';

const fixture = (name) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const REAL = fixture('reading-game-v1.json');
const DAMAGED = fixture('reading-game-v1-damaged.json');

function memoryStorage(initial = {}) {
  const data = { ...initial };
  const writes = [];
  return {
    data,
    writes,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      writes.push(k);
      data[k] = String(v);
    },
    removeItem: (k) => {
      writes.push(`remove:${k}`);
      delete data[k];
    },
  };
}

describe('importing the old Reading Game record', () => {
  it('brings readers, stars, scores and settings over on first load', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: REAL });
    const { record, status } = createStore(storage, { now: () => 1760000000000 }).load();
    expect(status).toBe('imported');
    expect(record.version).toBe(SCHEMA_VERSION);
    expect(record.profiles.map((p) => p.name)).toEqual(['Ava', 'Mary-Kate']);
    const ava = record.profiles[0];
    expect(ava).toMatchObject({ id: '6f1c2a1e-1b9a-4d7e-9a51-2d8f3c0b7e11', avatar: 'unicorn', createdAt: 1714560000000 });
    expect(ava.games.reading).toEqual({
      unlocked: 4,
      levels: { 1: { stars: 3, best: 214, plays: 3 }, 2: { stars: 2, best: 168, plays: 1 }, 3: { stars: 1, best: 120, plays: 2 } },
      totalScore: 1032,
      tricky: {},
      stats: {},
    });
    expect(record.profiles[1].games.reading).toMatchObject({ unlocked: 1, levels: {}, totalScore: 0 });
    expect(record.settings).toMatchObject({
      voiceURI: 'com.apple.voice.compact.en-US.Samantha', rate: 0.95, sfx: false, hiddenGames: [],
      games: { reading: { wordCase: 'title', unlockAll: true }, 'number-quest': { hints: true, unlockAll: false, voiceInput: false } },
    });
    // The child picks who's playing on the new hub.
    expect(record.activeProfileId).toBeNull();
    expect(record.imports).toEqual([{ from: LEGACY_KEY, at: 1760000000000, status: 'imported', profiles: 2, dropped: 0 }]);
  });

  it('leaves the old record exactly as it was, and saves the new one', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: REAL });
    createStore(storage).load();
    expect(storage.data[LEGACY_KEY]).toBe(REAL);
    expect(storage.writes).toEqual([STORAGE_KEY]);
    expect(JSON.parse(storage.data[STORAGE_KEY]).imports[0].status).toBe('imported');
  });

  it('imports only once: afterwards the playroom record wins', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: REAL });
    const store = createStore(storage);
    const first = store.load();
    first.record.profiles[0].name = 'Ava Rose';
    store.save(first.record);
    const second = store.load();
    expect(second.status).toBe('ok');
    expect(second.record.profiles[0].name).toBe('Ava Rose');
    expect(second.record.imports).toHaveLength(1);
  });

  it('does not import when a playroom record already exists', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: REAL });
    const store = createStore(storage);
    store.save({ version: SCHEMA_VERSION, settings: {}, profiles: [], activeProfileId: null, imports: [] });
    const { record, status } = store.load();
    expect(status).toBe('ok');
    expect(record.profiles).toEqual([]);
  });

  it('validates damaged old data like any untrusted input', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: DAMAGED });
    const { record, status } = createStore(storage).load();
    expect(status).toBe('imported-repaired');
    expect(record.profiles).toHaveLength(1);
    const ben = record.profiles[0];
    expect(ben).toMatchObject({ id: 'good-1', name: 'Ben', avatar: 'fox', createdAt: 0 });
    expect(ben.games.reading).toEqual({
      unlocked: 3,
      levels: { 1: { stars: 0, best: 150, plays: 2 }, 2: { stars: 2, best: 90, plays: 1 } },
      totalScore: 0,
      tricky: {},
      stats: {},
    });
    expect(Object.getPrototypeOf(ben.games.reading.levels)).toBe(Object.prototype);
    expect(record.settings).toMatchObject({ voiceURI: null, sfx: true, games: { reading: { wordCase: 'lower', unlockAll: false } } });
    expect(record.imports[0]).toMatchObject({ status: 'imported', profiles: 1, dropped: 5 });
    expect(storage.data[LEGACY_KEY]).toBe(DAMAGED);
  });

  it('starts fresh, keeps the old data and notes it, when the old record is corrupted', () => {
    for (const bad of ['{not json', '', 'null', '[]', '42', '{"version":1}', '{"version":1,"profiles":{}}', '{"version":2,"profiles":[]}', '{"version":0,"profiles":[]}']) {
      const storage = memoryStorage({ [LEGACY_KEY]: bad });
      const { record, status } = createStore(storage, { now: () => 5 }).load();
      expect(status, bad).toBe('import-failed');
      expect(record.profiles, bad).toEqual([]);
      expect(record.imports, bad).toEqual([{ from: LEGACY_KEY, at: 5, status: 'unreadable', profiles: 0, dropped: 0 }]);
      expect(storage.data[LEGACY_KEY], bad).toBe(bad); // never touched
      expect(BACKUP_KEY in storage.data, bad).toBe(false);
      // ...and it isn't retried on the next load.
      expect(createStore(storage).load().status, bad).toBe('ok');
    }
  });

  it('never crashes when storage is blocked', () => {
    expect(createStore(null).load().status).toBe('unavailable');
    const throwing = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('nope'); } };
    expect(createStore(throwing).load().status).toBe('unavailable');
  });

  it('still records the import when saving fails', () => {
    const storage = memoryStorage({ [LEGACY_KEY]: REAL });
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const { record, status } = createStore(storage).load();
    expect(status).toBe('imported');
    expect(record.profiles).toHaveLength(2);
  });
});

describe('migration 2 → 3', () => {
  it('gives every reader an empty sticker book, keeping their stars', () => {
    const v2 = migrate(JSON.parse(REAL), MIGRATIONS, 2);
    const v3 = migrate(v2, MIGRATIONS, 3);
    expect(v3.version).toBe(3);
    expect(v3.profiles.map((p) => p.stickers)).toEqual([{ seen: 0, scenes: {} }, { seen: 0, scenes: {} }]);
    expect(v3.profiles[0].games.reading.totalScore).toBe(1032);
  });

  it('upgrades a saved session-1 playroom record in place', () => {
    const v2 = migrate(JSON.parse(REAL), MIGRATIONS, 2);
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v2) });
    const { record, status } = createStore(storage).load();
    expect(status).toBe('ok');
    expect(record.version).toBe(3);
    expect(record.profiles[0].stickers).toEqual({ seen: 0, scenes: {} });
  });

  it('checks sticker books like any other saved data', () => {
    const v2 = migrate(JSON.parse(REAL), MIGRATIONS, 2);
    const v3 = migrate(v2, MIGRATIONS, 3);
    v3.profiles[0].stickers = {
      seen: 999,
      scenes: {
        beach: [{ id: 'crab', x: 50, y: 150 }, { id: 'dragon', x: 1, y: 1 }, { id: 'sun', x: 'left', y: 3 }, null],
        moon: [{ id: 'sun', x: 1, y: 1 }],
        garden: 'flowers',
      },
    };
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v3) });
    const { record } = createStore(storage).load();
    expect(record.profiles[0].stickers).toEqual({ seen: 0, scenes: { beach: [{ id: 'crab', x: 50, y: 100 }] } });
  });
});

describe('migration 1 → 2', () => {
  it('moves progress under games.reading and settings under settings.games.reading', () => {
    const v2 = migrate(JSON.parse(REAL), MIGRATIONS, 2);
    expect(v2.version).toBe(2);
    expect(v2.profiles[0].games.reading.totalScore).toBe(1032);
    expect(v2.profiles[0].levels).toBeUndefined();
    expect(v2.settings.games.reading).toEqual({ wordCase: 'title', unlockAll: true });
    expect(v2.settings.wordCase).toBeUndefined();
  });

  it('refuses a version 1 record without a profiles list', () => {
    expect(() => migrate({ version: 1, profiles: 'x' }, MIGRATIONS)).toThrow(/profiles/);
  });

  it('importLegacy always returns a usable record', () => {
    const { record } = importLegacy('{"version":1,"profiles":[{"__proto__":{"polluted":true},"id":"x","name":"Zoë"}]}');
    expect(record.profiles[0].name).toBe('Zoë');
    expect({}.polluted).toBeUndefined();
  });
});
