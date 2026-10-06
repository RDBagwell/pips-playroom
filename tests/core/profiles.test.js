import { describe, it, expect } from 'vitest';
import {
  validateName, addProfile, renameProfile, deleteProfile, resetProfile, highScores,
  MAX_PROFILES, AVATARS, avatarFor,
} from '../../core/profiles.js';
import { freshRecord } from '../../core/storage.js';
import { gameProgress } from '../../core/progress.js';

describe('validateName', () => {
  it('trims and collapses spaces', () => {
    expect(validateName('  Ava   Rose ')).toEqual({ ok: true, name: 'Ava Rose' });
  });

  it("allows letters, spaces, hyphens and apostrophes (including curly ones)", () => {
    expect(validateName("Mary-Kate").ok).toBe(true);
    expect(validateName('O’Neil')).toEqual({ ok: true, name: "O'Neil" });
    expect(validateName('Zoë').ok).toBe(true);
    expect(validateName('José').ok).toBe(true);
  });

  it('rejects empty, too long, digits, symbols and markup', () => {
    expect(validateName('   ').ok).toBe(false);
    expect(validateName(undefined).ok).toBe(false);
    expect(validateName('Abcdefghijklm').ok).toBe(false); // 13
    expect(validateName('Abcdefghijkl').ok).toBe(true); // 12
    expect(validateName('Sam2').ok).toBe(false);
    expect(validateName('<b>Hi</b>').ok).toBe(false);
    expect(validateName('😀').ok).toBe(false);
    expect(validateName("--'").ok).toBe(false);
  });

  it('gives a friendly message', () => {
    expect(validateName('').error).toMatch(/Type a name/);
    expect(validateName('Abcdefghijklmn').error).toMatch(/12 letters/);
  });
});

describe('profile operations', () => {
  it('adds up to six profiles with unique names', () => {
    const r = freshRecord();
    for (let i = 0; i < MAX_PROFILES; i += 1) {
      expect(addProfile(r, { name: `Kid ${'abcdef'[i]}`, avatar: 'fox' }).ok).toBe(true);
    }
    const seventh = addProfile(r, { name: 'Seven', avatar: 'fox' });
    expect(seventh.ok).toBe(false);
    expect(seventh.error).toMatch(/6 readers/);
    const r2 = freshRecord();
    addProfile(r2, { name: 'Ava', avatar: 'fox' });
    expect(addProfile(r2, { name: 'ava', avatar: 'bear' }).ok).toBe(false);
  });

  it('creates a fresh profile with level 1 unlocked and a known avatar', () => {
    const r = freshRecord();
    const { profile } = addProfile(r, { name: 'Max', avatar: 'not-real' });
    expect(profile).toMatchObject({ name: 'Max', avatar: AVATARS[0].id, games: {} });
    // Each game's progress starts at level 1 the first time it's played.
    expect(gameProgress(profile, 'reading')).toMatchObject({ unlocked: 1, totalScore: 0, levels: {} });
    expect(avatarFor('frog').emoji).toBe('🐸');
  });

  it('renames, resets and deletes', () => {
    const r = freshRecord();
    const { profile } = addProfile(r, { name: 'Max', avatar: 'fox' });
    addProfile(r, { name: 'Ava', avatar: 'fox' });
    expect(renameProfile(r, profile.id, 'Ava').ok).toBe(false);
    expect(renameProfile(r, profile.id, ' Maxi ').ok).toBe(true);
    expect(profile.name).toBe('Maxi');
    const reading = gameProgress(profile, 'reading');
    reading.totalScore = 50;
    reading.unlocked = 4;
    reading.levels = { 1: { stars: 3, best: 90, plays: 1 } };
    expect(resetProfile(r, profile.id)).toBe(true);
    expect(gameProgress(profile, 'reading')).toMatchObject({ totalScore: 0, unlocked: 1, levels: {} });
    r.activeProfileId = profile.id;
    expect(deleteProfile(r, profile.id)).toBe(true);
    expect(r.profiles).toHaveLength(1);
    expect(r.activeProfileId).toBeNull();
    expect(deleteProfile(r, 'nope')).toBe(false);
  });

  it('ranks the high score board by total score, then stars', () => {
    const r = freshRecord();
    const names = ['Ava', 'Ben', 'Cy', 'Di'];
    names.forEach((name) => addProfile(r, { name, avatar: 'fox' }));
    gameProgress(r.profiles[0], 'reading').totalScore = 100;
    gameProgress(r.profiles[1], 'reading').totalScore = 300;
    gameProgress(r.profiles[2], 'reading').totalScore = 100;
    gameProgress(r.profiles[2], 'reading').levels = { 1: { stars: 3, best: 100, plays: 1 } };
    const board = highScores(r, 10, 'reading');
    expect(board.map((b) => b.name)).toEqual(['Ben', 'Cy', 'Ava', 'Di']);
    expect(board[1].stars).toBe(3);
    expect(highScores(r, 2, 'reading')).toHaveLength(2);
  });
});

describe('scores across games', () => {
  it('ranks one game, or every game added together', () => {
    const r = freshRecord();
    ['Ava', 'Ben'].forEach((name) => addProfile(r, { name, avatar: 'fox' }));
    gameProgress(r.profiles[0], 'reading').totalScore = 100;
    gameProgress(r.profiles[1], 'reading').totalScore = 60;
    gameProgress(r.profiles[1], 'number-quest').totalScore = 80;
    gameProgress(r.profiles[1], 'number-quest').levels = { 1: { stars: 2, best: 80, plays: 1 } };
    expect(highScores(r, 10, 'reading').map((b) => b.name)).toEqual(['Ava', 'Ben']);
    expect(highScores(r, 10, 'number-quest').map((b) => [b.name, b.score, b.stars])).toEqual([['Ben', 80, 2], ['Ava', 0, 0]]);
    expect(highScores(r).map((b) => [b.name, b.score])).toEqual([['Ben', 140], ['Ava', 100]]);
  });

  it('resets just one game when asked', () => {
    const r = freshRecord();
    const { profile } = addProfile(r, { name: 'Ava', avatar: 'fox' });
    gameProgress(profile, 'reading').totalScore = 10;
    gameProgress(profile, 'number-quest').totalScore = 20;
    expect(resetProfile(r, profile.id, 'number-quest')).toBe(true);
    expect(profile.games.reading.totalScore).toBe(10);
    expect(profile.games['number-quest']).toBeUndefined();
  });
});
