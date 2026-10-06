import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerGame, validateGame, getGame, allGames, clearGames, sanitizeGameSettings, defaultGameSettings, loadAllGames,
} from '../../core/registry.js';
import * as router from '../../core/router.js';

const game = (over = {}) => ({
  id: 'demo',
  title: 'Demo Game',
  tagline: 'A test game',
  icon: () => null,
  data: './data/demo/levels.json',
  loadLevels: (json) => json.levels,
  start: 'map',
  screens: { map: () => ({ node: null }), play: () => ({ node: null }) },
  settings: { fast: { type: 'boolean', default: false }, size: { type: 'enum', values: ['s', 'm'], default: 'm' } },
  ...over,
});

beforeEach(() => clearGames());

describe('registering a game', () => {
  it('takes one call and registers its screens under the game id', () => {
    const spy = vi.spyOn(router, 'register');
    const entry = registerGame(game());
    expect(getGame('demo')).toBe(entry);
    expect(allGames().map((g) => g.id)).toEqual(['demo']);
    expect(spy.mock.calls.map((c) => c[0])).toEqual(['demo/map', 'demo/play']);
    // Game screens are titled with the game's name.
    const map = spy.mock.calls[0][1];
    expect(map({}).appTitle).toBe('Demo Game');
    spy.mockRestore();
  });

  it('refuses duplicates and broken definitions, naming every problem', () => {
    registerGame(game());
    expect(() => registerGame(game())).toThrow(/already registered/);
    expect(validateGame(null)).toEqual(['a game must be an object']);
    const errors = validateGame(game({
      id: 'Bad Id', title: '', data: 'https://example.com/x.json', icon: 'x', loadLevels: null, start: 'nope',
      screens: { map: 'x' }, settings: { a: { type: 'number' }, b: { type: 'enum', values: ['x'], default: 'y' }, c: { type: 'boolean', default: 1 } },
    }));
    expect(errors.join('\n')).toMatch(/"id"/);
    expect(errors.join('\n')).toMatch(/"title"/);
    expect(errors.join('\n')).toMatch(/relative path/);
    expect(errors.join('\n')).toMatch(/"icon"/);
    expect(errors.join('\n')).toMatch(/"loadLevels"/);
    expect(errors.join('\n')).toMatch(/screen "map" must be a function/);
    expect(errors.join('\n')).toMatch(/"start" screen "nope"/);
    expect(errors.join('\n')).toMatch(/setting "a"/);
    expect(errors.join('\n')).toMatch(/setting "b"/);
    expect(errors.join('\n')).toMatch(/setting "c"/);
  });

  it('cleans each game’s settings against its spec', () => {
    const spec = game().settings;
    expect(sanitizeGameSettings(spec, { fast: 'yes', size: 'xl', extra: 1 })).toEqual({ fast: false, size: 'm' });
    expect(sanitizeGameSettings(spec, { fast: true, size: 's' })).toEqual({ fast: true, size: 's' });
    expect(sanitizeGameSettings(spec, null)).toEqual({ fast: false, size: 'm' });
    registerGame(game());
    expect(defaultGameSettings()).toEqual({ demo: { fast: false, size: 'm' } });
  });

  it('loads each game’s data; a game that fails is marked, the others still work', async () => {
    registerGame(game());
    registerGame(game({ id: 'broken', data: './data/broken.json' }));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = async (url) => (url === './data/demo/levels.json'
      ? { ok: true, json: async () => ({ levels: [{ id: 1 }] }) }
      : { ok: false, status: 404 });
    await loadAllGames(fetchFn);
    expect(getGame('demo')).toMatchObject({ status: 'ready', levels: [{ id: 1 }] });
    expect(getGame('broken')).toMatchObject({ status: 'error', levels: [] });
    errors.mockRestore();
  });
});

describe('the real games', () => {
  it('both register cleanly', async () => {
    const { reading } = await import('../../games/reading/game.js');
    const { numberQuest } = await import('../../games/number-quest/game.js');
    expect(validateGame(reading)).toEqual([]);
    expect(validateGame(numberQuest)).toEqual([]);
  });
});
