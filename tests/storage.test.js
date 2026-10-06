import { describe, it, expect } from 'vitest';
import {
  createStore, freshRecord, migrate, sanitizeRecord, getBrowserStorage,
  STORAGE_KEY, BACKUP_KEY, SCHEMA_VERSION,
} from '../js/storage.js';
import { addProfile } from '../js/profiles.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

function sampleRecord() {
  const r = freshRecord();
  const { profile } = addProfile(r, { name: 'Ava', avatar: 'frog' }, { id: 'a1', now: 1 });
  profile.totalScore = 420;
  profile.unlocked = 3;
  profile.levels = { 1: { stars: 3, best: 200, plays: 2 }, 2: { stars: 1, best: 120, plays: 1 } };
  r.activeProfileId = 'a1';
  r.settings.rate = 1;
  r.settings.wordCase = 'title';
  return r;
}

describe('store', () => {
  it('starts fresh when nothing is saved', () => {
    const { record, status } = createStore(memoryStorage()).load();
    expect(status).toBe('new');
    expect(record).toEqual(freshRecord());
  });

  it('saves and loads a round trip', () => {
    const storage = memoryStorage();
    const store = createStore(storage);
    const r = sampleRecord();
    expect(store.save(r)).toBe(true);
    const loaded = store.load();
    expect(loaded.status).toBe('ok');
    expect(loaded.record).toEqual(r);
    expect(JSON.parse(storage.data[STORAGE_KEY]).version).toBe(SCHEMA_VERSION);
  });

  it('falls back to a fresh start on corrupted JSON and keeps a backup', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{not json' });
    const { record, status } = createStore(storage).load();
    expect(status).toBe('corrupt');
    expect(record).toEqual(freshRecord());
    expect(storage.data[BACKUP_KEY]).toBe('{not json');
  });

  it('treats wrong shapes as corrupt instead of crashing', () => {
    for (const bad of ['null', '42', '[]', '"hi"', '{"version":1}', '{"version":1,"profiles":{}}', '{"profiles":[]}', '{"version":99,"profiles":[]}']) {
      const { status } = createStore(memoryStorage({ [STORAGE_KEY]: bad })).load();
      expect(status, bad).toBe('corrupt');
    }
  });

  it('skips unreadable profiles and repairs bad fields', () => {
    const r = sampleRecord();
    r.profiles.push({ id: 'x', name: '<script>', avatar: 'fox' });
    r.profiles.push('nonsense');
    r.profiles.push({ ...r.profiles[0] }); // duplicate id
    r.profiles[0].levels['1'].stars = 99;
    r.profiles[0].levels.hack = { stars: 1 };
    r.profiles[0].totalScore = -5;
    r.profiles[0].avatar = 'dragon';
    r.settings = { rate: 'fast', wordCase: 'SHOUTY', sfx: 'yes', unlockAll: 1 };
    r.activeProfileId = 'ghost';
    const { record, status } = createStore(memoryStorage({ [STORAGE_KEY]: JSON.stringify(r) })).load();
    expect(status).toBe('repaired');
    expect(record.profiles).toHaveLength(1);
    const p = record.profiles[0];
    expect(p.levels).toEqual({ 1: { stars: 0, best: 200, plays: 2 }, 2: { stars: 1, best: 120, plays: 1 } });
    expect(p.totalScore).toBe(0);
    expect(p.avatar).toBe('fox');
    expect(record.settings).toEqual(freshRecord().settings);
    expect(record.activeProfileId).toBeNull();
  });

  it('keeps working without saving when storage is unavailable', () => {
    const store = createStore(null);
    expect(store.available).toBe(false);
    expect(store.load().status).toBe('unavailable');
    expect(store.save(sampleRecord())).toBe(false);
  });

  it('never throws when storage calls throw', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = createStore(throwing);
    expect(store.load().status).toBe('unavailable');
    expect(store.save(sampleRecord())).toBe(false);
  });

  it('detects blocked browser storage', () => {
    expect(getBrowserStorage({})).toBeNull();
    const blocked = {};
    Object.defineProperty(blocked, 'localStorage', {
      get() {
        throw new Error('blocked');
      },
    });
    expect(getBrowserStorage(blocked)).toBeNull();
    expect(getBrowserStorage({ localStorage: memoryStorage() })).not.toBeNull();
  });
});

describe('migrations', () => {
  const migrations = {
    1: (r) => ({ ...r, version: 2, settings: { ...r.settings, confetti: true } }),
    2: (r) => ({ ...r, version: 3, profiles: r.profiles.map((p) => ({ ...p, hat: 'none' })) }),
  };

  it('runs each step in order up to the target version', () => {
    const r = migrate({ version: 1, settings: {}, profiles: [{ id: 'a' }] }, migrations, 3);
    expect(r.version).toBe(3);
    expect(r.settings.confetti).toBe(true);
    expect(r.profiles[0].hat).toBe('none');
  });

  it('leaves a current record alone', () => {
    const r = { version: 3, profiles: [] };
    expect(migrate(r, migrations, 3)).toBe(r);
  });

  it('refuses missing steps, newer records and broken migrations', () => {
    expect(() => migrate({ version: 1 }, {}, 2)).toThrow(/No migration/);
    expect(() => migrate({ version: 4 }, migrations, 3)).toThrow(/newer/);
    expect(() => migrate({}, migrations, 3)).toThrow(/version/);
    expect(() => migrate({ version: 1 }, { 1: () => ({ version: 5 }) }, 2)).toThrow(/did not produce/);
  });

  it('the store applies migrations when loading an older record', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 0, profiles: [] }) });
    const store = createStore(storage, { migrations: { 0: (r) => ({ ...r, version: 1, settings: { rate: 1.2 } }) } });
    const { record, status } = store.load();
    expect(status).toBe('ok');
    expect(record.settings.rate).toBeCloseTo(1.2);
  });
});

describe('sanitizeRecord', () => {
  it('returns null for unusable records', () => {
    expect(sanitizeRecord(null)).toBeNull();
    expect(sanitizeRecord({ version: SCHEMA_VERSION })).toBeNull();
  });
});
