// @vitest-environment jsdom
// The sticker book through the real screens: stars from any game unlock
// stickers; the child places them on pages, and the arrangement is saved.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { fakeFetch } from '../helpers/games.js';
import { createMockWindow, VOICES } from '../helpers/mockSpeech.js';

let mock;
let ctx;
let go;
const flush = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const app = () => document.getElementById('app');
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const saved = () => JSON.parse(localStorage.getItem('pips-playroom')).profiles[0];

beforeAll(async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<main id="app"></main>';
  mock = createMockWindow({ voices: VOICES });
  window.speechSynthesis = mock.synth;
  window.SpeechSynthesisUtterance = mock.win.SpeechSynthesisUtterance;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  Element.prototype.scrollIntoView = () => {};
  globalThis.fetch = fakeFetch();
  await import('../../core/main.js');
  ({ ctx } = await import('../../core/context.js'));
  ({ go } = await import('../../core/router.js'));
  await flush(10);
  button('Tap to play').click();
  document.getElementById('reader-name').value = 'Ava';
  button("Let's go").click();
});

afterAll(() => vi.useRealTimers());

describe('the sticker book', () => {
  it('starts empty, with the first sticker one star away', () => {
    expect(document.querySelector('.sticker-party')).toBeNull();
    expect(document.querySelector('.sticker-banner').textContent).toMatch(/0 of 24 stickers · 1 more star for the next sticker!/);
    document.querySelector('.sticker-banner').click();
    expect(app().dataset.screen).toBe('stickers');
    expect(document.querySelectorAll('button.tray-sticker')).toHaveLength(0);
    expect(document.querySelectorAll('.tray-sticker.locked')).toHaveLength(24);
    expect(document.querySelector('.empty').textContent).toMatch(/earn a star/);
  });

  it('unlocks stickers from stars in any game, and celebrates them once on the hub', () => {
    const p = ctx.record.profiles[0];
    p.games['number-quest'] = { unlocked: 2, levels: { 1: { stars: 3, best: 80, plays: 1 } }, totalScore: 80, tricky: {}, stats: {} };
    p.games.typing = { unlocked: 2, levels: { 1: { stars: 2, best: 40, plays: 1 } }, totalScore: 40, tricky: {}, stats: {} };
    go('hub');
    expect(document.querySelector('.sticker-party h2').textContent).toBe('3 new stickers!');
    expect(mock.spoken.at(-2).text).toBe('You got 3 new stickers!');
    go('hub');
    expect(document.querySelector('.sticker-party')).toBeNull(); // only once
    expect(document.querySelector('.sticker-banner').textContent).toMatch(/3 of 24 stickers · 3 more stars for the next sticker!/);
  });

  it('places a sticker with a tap and saves it', () => {
    go('stickers');
    expect(document.querySelectorAll('button.tray-sticker')).toHaveLength(3);
    document.querySelector('button.tray-sticker[data-id="fish"]').click();
    const placed = document.querySelector('.placed[data-id="fish"]');
    expect(placed).not.toBeNull();
    expect(placed.getAttribute('aria-pressed')).toBe('true');
    expect(saved().stickers.scenes.beach).toEqual([{ id: 'fish', x: 30, y: 35 }]);
  });

  it('moves it with the arrow keys and takes it off with Delete', () => {
    let placed = document.querySelector('.placed[data-id="fish"]');
    placed.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    placed = document.querySelector('.placed[data-id="fish"]');
    placed.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(saved().stickers.scenes.beach).toEqual([{ id: 'fish', x: 34, y: 39 }]);
    expect(document.querySelector('.placed[data-id="fish"]').style.left).toBe('34%');
    document.querySelector('.placed[data-id="fish"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(document.querySelector('.placed')).toBeNull();
    expect(saved().stickers.scenes.beach).toEqual([]);
  });

  it('keeps each page separately, per reader', () => {
    button('Night Sky').click();
    expect(document.querySelector('.scene').classList.contains('scene-night')).toBe(true);
    document.querySelector('button.tray-sticker[data-id="sun"]').click();
    button('Sunny Beach').click();
    expect(document.querySelector('.placed')).toBeNull();
    button('Night Sky').click();
    expect(document.querySelectorAll('.placed')).toHaveLength(1);
    expect(saved().stickers.scenes.night).toEqual([{ id: 'sun', x: 30, y: 35 }]);
  });

  it('mentions the sticker book after a level', () => {
    const p = ctx.record.profiles[0];
    go('math-garden/complete', { levelId: 1, stars: 1, bonus: 20, base: 40, score: 60, outcome: { newBest: false, unlockedNext: false }, tally: [] });
    expect(document.querySelector('.sticker-news').textContent).toMatch(/more stars? for the next sticker!/);
    p.games['math-garden'] = { unlocked: 2, levels: { 1: { stars: 3, best: 60, plays: 1 } }, totalScore: 60, tricky: {}, stats: {} };
    go('math-garden/complete', { levelId: 1, stars: 3, bonus: 60, base: 80, score: 140, outcome: { newBest: false, unlockedNext: true }, tally: [] });
    expect(document.querySelector('.sticker-news').textContent).toBe('📒 A new sticker is waiting in the playroom!');
  });
});
