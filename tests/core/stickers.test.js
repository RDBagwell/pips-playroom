import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  STICKERS, SCENES, MAX_PER_SCENE, freshStickerBook, unlockedStickers, nextSticker, nextStickerText, newStickers, markSeen,
  placeSticker, moveSticker, removeSticker, sceneStickers, sanitizeStickerBook,
} from '../../core/stickers.js';
import { ART_IDS } from '../../core/sticker-art.js';
import { GAME_IDS } from '../helpers/games.js';

const maxStars = GAME_IDS.reduce((n, id) => n + JSON.parse(readFileSync(`${process.cwd()}/data/${id}/levels.json`, 'utf8')).levels.length * 3, 0);

describe('unlocking stickers', () => {
  it('has art for every sticker, drawn in code', () => {
    expect(ART_IDS.sort()).toEqual(STICKERS.map((s) => s.id).sort());
    expect(STICKERS.length).toBeGreaterThanOrEqual(20);
  });

  it('unlocks at fixed star counts, in order, with the first after one star', () => {
    const at = STICKERS.map((s) => s.at);
    expect(at[0]).toBe(1);
    for (let i = 1; i < at.length; i += 1) expect(at[i]).toBeGreaterThan(at[i - 1]);
  });

  it('can unlock every sticker with the stars the games offer', () => {
    expect(maxStars).toBe(123);
    expect(STICKERS.at(-1).at).toBeLessThanOrEqual(maxStars);
  });

  it('is the same every time: no randomness', () => {
    for (let stars = 0; stars <= 130; stars += 1) {
      expect(unlockedStickers(stars)).toEqual(unlockedStickers(stars));
      expect(unlockedStickers(stars).length).toBe(STICKERS.filter((s) => s.at <= stars).length);
    }
  });

  it('says how many more stars the next one needs', () => {
    expect(nextSticker(0)).toEqual({ sticker: STICKERS[0], more: 1 });
    expect(nextStickerText(0)).toBe('1 more star for the next sticker!');
    expect(nextStickerText(6)).toBe('2 more stars for the next sticker!');
    expect(nextStickerText(500)).toBe('You have every sticker!');
    expect(nextSticker(500)).toBeNull();
  });

  it('celebrates each new sticker once, and copes with a reset', () => {
    const book = freshStickerBook();
    expect(newStickers(book, 6).map((s) => s.id)).toEqual(['sun', 'fish', 'bunny']);
    markSeen(book, 6);
    expect(newStickers(book, 6)).toEqual([]);
    expect(newStickers(book, 8).map((s) => s.id)).toEqual(['flower']);
    // A grown-up resets the games: nothing to celebrate, and earning them again celebrates again.
    expect(newStickers(book, 0)).toEqual([]);
    expect(book.seen).toBe(0);
    expect(newStickers(book, 1).map((s) => s.id)).toEqual(['sun']);
  });
});

describe('placing stickers', () => {
  it('places, moves and takes off unlocked stickers, within the page', () => {
    const book = freshStickerBook();
    expect(placeSticker(book, 'beach', 'crab', 40, 50, 20)).toBe(0);
    expect(placeSticker(book, 'beach', 'fox', 40, 50, 20)).toBe(-1); // still locked
    expect(placeSticker(book, 'moon', 'sun', 1, 1, 20)).toBe(-1); // no such page
    expect(moveSticker(book, 'beach', 0, 150, -20)).toBe(true);
    expect(sceneStickers(book, 'beach')).toEqual([{ id: 'crab', x: 100, y: 0 }]);
    expect(removeSticker(book, 'beach', 0)).toBe(true);
    expect(removeSticker(book, 'beach', 0)).toBe(false);
  });

  it('keeps a page from overflowing', () => {
    const book = freshStickerBook();
    for (let i = 0; i < MAX_PER_SCENE; i += 1) expect(placeSticker(book, 'garden', 'sun', 50, 50, 1)).toBe(i);
    expect(placeSticker(book, 'garden', 'sun', 50, 50, 1)).toBe(-1);
  });

  it('has three scene pages', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['beach', 'garden', 'night']);
  });

  it('checks a stored sticker book like untrusted input', () => {
    expect(sanitizeStickerBook(null)).toEqual(freshStickerBook());
    expect(sanitizeStickerBook({ seen: -1, scenes: [] })).toEqual(freshStickerBook());
    const tooMany = Array.from({ length: 50 }, () => ({ id: 'sun', x: 1, y: 2 }));
    expect(sanitizeStickerBook({ seen: 2, scenes: { night: tooMany } }).scenes.night).toHaveLength(MAX_PER_SCENE);
  });
});

describe('the art', () => {
  it('is all in code: no image files, no external links', () => {
    const src = readFileSync(`${process.cwd()}/core/sticker-art.js`, 'utf8');
    expect(src).not.toMatch(/href|\.png|\.svg['"]|url\(/);
    expect(readdirSync(`${process.cwd()}/icons`).every((f) => !/sticker/i.test(f))).toBe(true);
  });
});
