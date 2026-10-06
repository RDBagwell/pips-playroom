// @vitest-environment jsdom
// Type with Pip end to end with real keydown events, plus the no-keyboard card.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { fakeFetch } from '../helpers/games.js';
import { createMockWindow, VOICES } from '../helpers/mockSpeech.js';

let mock;
let ctx;
let go;
let detect;
let coarse = false;
const flush = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const app = () => document.getElementById('app');
const spoken = () => mock.spoken.map((u) => u.text);
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const press = (key, extra = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
/** The text on screen, as the child sees it (no-break spaces back to spaces). */
const targetText = () => [...document.querySelectorAll('.type-target .ch')].map((c) => c.textContent.replace(' ', ' ')).join('');

beforeAll(async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<main id="app"></main>';
  mock = createMockWindow({ voices: VOICES });
  window.speechSynthesis = mock.synth;
  window.SpeechSynthesisUtterance = mock.win.SpeechSynthesisUtterance;
  window.matchMedia = (q) => ({ matches: q === '(pointer: coarse)' ? coarse : false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  Element.prototype.scrollIntoView = () => {};
  globalThis.fetch = fakeFetch();
  await import('../../core/main.js');
  ({ ctx } = await import('../../core/context.js'));
  ({ go } = await import('../../core/router.js'));
  detect = await import('../../games/typing/detect.js');
  await flush(10);
});

afterAll(() => vi.useRealTimers());

describe('Type with Pip', () => {
  it('opens from the hub', () => {
    button('Tap to play').click();
    document.getElementById('reader-name').value = 'Ava';
    button("Let's go").click();
    document.querySelector('.game-card[data-game="typing"]').click();
    expect(app().dataset.screen).toBe('typing/map');
    expect(document.querySelectorAll('.stone')).toHaveLength(11);
  });

  it('plays the home row: letters go green, wrong keys are ignored, nothing is deleted', async () => {
    document.querySelector('.stone:not(.locked)').click();
    await flush(400);
    expect(document.activeElement.classList.contains('type-target')).toBe(true); // no text field, so no on-screen keyboard
    expect(document.querySelector('input, textarea, [contenteditable]')).toBeNull();
    for (let i = 0; i < 10; i += 1) {
      const letter = targetText();
      expect(letter).toMatch(/^[asdfjkl]$/);
      expect(spoken().at(-1)).toBe(`Find the letter ${letter.toUpperCase()}!`);
      expect(document.querySelector(`.kb-key.next[data-key="${letter}"]`)).not.toBeNull();
      if (i === 0) {
        const wrong = letter === 'q' ? 'w' : 'q';
        press(wrong);
        press('Backspace');
        press('Shift');
        press(letter, { repeat: true }); // auto-repeat never counts
        expect(document.querySelector('.ch').classList.contains('ch-typed')).toBe(false);
        expect(document.querySelector(`.kb-key.nudge[data-key="${letter}"]`)).not.toBeNull();
        press(letter.toUpperCase(), { shiftKey: true }); // a capital is fine
      } else {
        press(letter);
      }
      expect(document.querySelector('.ch').classList.contains('ch-typed')).toBe(true);
      await flush(4000);
    }
    expect(app().dataset.screen).toBe('typing/complete');
    expect(document.querySelector('.tally').textContent).toMatch(/Letters found10/);
    expect(document.querySelector('.tally').textContent).toMatch(/Right keys91%/);
    expect(document.querySelectorAll('.big-star.earned')).toHaveLength(3);
  });

  it('saved stars, the key to practise, and no speed', () => {
    const p = JSON.parse(localStorage.getItem('pips-playroom')).profiles[0].games.typing;
    expect(p.unlocked).toBe(2);
    expect(p.levels['1'].stars).toBe(3);
    expect(Object.values(p.tricky)).toEqual([1]);
    expect(p.stats).toMatchObject({ keys: 10, wrongKeys: 1 });
    expect(p.stats.bestWpm).toBeUndefined();
  });

  it('types a Reading Game word, and hides it for "Listen and spell"', async () => {
    const s = ctx.record.settings.games.typing;
    s.unlockAll = true;
    s.listenAndSpell = true;
    s.showWpm = true;
    go('typing/play', { levelId: 5 });
    await flush(400);
    expect(spoken().slice(-2)[0]).toBe('Listen and spell:');
    const word = spoken().at(-1);
    const readingWords = ctx.record && (await import('../../core/registry.js')).getGame('reading').levels[0].words;
    expect(readingWords).toContain(word);
    expect(targetText()).toBe('_'.repeat(word.length));
    press(word[0]);
    expect(targetText()).toBe(word[0] + '_'.repeat(word.length - 1));
    for (const c of word.slice(1)) press(c);
    await flush(4000);
    expect(targetText()).not.toMatch(/[a-z]/i);
  });

  it('shows words per minute only when a grown-up asks, as information', async () => {
    go('typing/play', { levelId: 4 });
    await flush(400);
    for (let i = 0; i < 8; i += 1) {
      for (const c of targetText()) press(c);
      await flush(4000);
    }
    expect(app().dataset.screen).toBe('typing/complete');
    expect(document.querySelector('.tally').textContent).toMatch(/Words per minute\d+/);
  });

  it('types sentences with spaces and a full stop', async () => {
    ctx.record.settings.games.typing.listenAndSpell = false;
    go('typing/play', { levelId: 11 });
    await flush(400);
    const sentence = targetText();
    expect(sentence).toMatch(/^[a-zI ]+\.$/);
    for (const c of sentence) press(c);
    expect(document.querySelectorAll('.type-target .ch.ch-typed')).toHaveLength(sentence.length);
  });

  it('on a touch-only device, says it needs a keyboard and offers tapping as practice', async () => {
    detect.resetKeyPress();
    coarse = true;
    go('typing/play', { levelId: 1 });
    await flush(400);
    const card = document.querySelector('.keyboard-card');
    expect(card.hidden).toBe(false);
    expect(card.textContent).toMatch(/This game needs a keyboard/);
    expect(document.querySelector('.type-area').hidden).toBe(true);
    button('Tap the keys instead').click();
    await flush(400);
    expect(document.querySelector('.practice-badge').hidden).toBe(false);
    const letter = targetText();
    const keyButton = document.querySelector(`button.kb-key[data-key="${letter}"]`);
    expect(keyButton).not.toBeNull();
    keyButton.click();
    expect(document.querySelector('.ch').classList.contains('ch-typed')).toBe(true);
  });

  it('starts the normal game as soon as a real key is pressed on that device', async () => {
    detect.resetKeyPress();
    go('typing/play', { levelId: 1 });
    await flush(400);
    expect(document.querySelector('.keyboard-card').hidden).toBe(false);
    press('a');
    await flush(400);
    expect(document.querySelector('.keyboard-card').hidden).toBe(true);
    expect(document.querySelector('.practice-badge').hidden).toBe(true);
    expect(document.querySelector('button.kb-key')).toBeNull(); // a picture, not buttons
    coarse = false;
  });
});
