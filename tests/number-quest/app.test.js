// @vitest-environment jsdom
// Number Quest end to end through the real screens: speech and speech
// recognition are mocked, and there is no network.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GAME_IDS, DATA_URLS, fakeFetch } from '../helpers/games.js';
import { createMockWindow, VOICES } from '../helpers/mockSpeech.js';
import { createMockRecognition } from '../helpers/mockRecognition.js';

let mock;
let recognition;
let ctx;
let go;
const requests = [];

const flush = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
};
const app = () => document.getElementById('app');
const spokenText = () => mock.spoken.map((u) => u.text);
const lastSpoken = () => mock.spoken[mock.spoken.length - 1].text;
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const tile = (n) => document.querySelector(`.num-tile[data-n="${n}"]`);

/** Find Pip's number by always tapping the middle of what's left. */
async function playRoundByHalving(enter) {
  let low = Number(document.querySelector('.track-min').textContent);
  let high = Number(document.querySelector('.track-max').textContent);
  for (let i = 0; i < 12; i += 1) {
    const n = Math.floor((low + high) / 2);
    await enter(n);
    const said = lastSpoken();
    if (said === 'Higher!') low = n + 1;
    else if (said === 'Lower!') high = n - 1;
    else {
      expect(said).toMatch(/You found it/);
      return i + 1;
    }
  }
  throw new Error('never found the number');
}

beforeAll(async () => {
  vi.useFakeTimers();
  document.body.innerHTML = '<main id="app"></main>';
  mock = createMockWindow({ voices: VOICES });
  window.speechSynthesis = mock.synth;
  window.SpeechSynthesisUtterance = mock.win.SpeechSynthesisUtterance;
  recognition = createMockRecognition({ status: 'available' });
  window.SpeechRecognition = recognition.SpeechRecognition;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  Element.prototype.scrollIntoView = () => {};
  globalThis.fetch = fakeFetch(requests);
  await import('../../core/main.js');
  ({ ctx } = await import('../../core/context.js'));
  ({ go } = await import('../../core/router.js'));
  await flush(10);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('Number Quest', () => {
  it('is on the hub as a card with its stars', async () => {
    button('Tap to play').click();
    document.getElementById('reader-name').value = 'Ava';
    button("Let's go").click();
    expect(app().dataset.screen).toBe('hub');
    const card = document.querySelector('.game-card[data-game="number-quest"]');
    expect(card.textContent).toMatch(/Number Quest\..*0 of 18 stars/); // named by its visible text (WCAG 2.5.3)
    expect(card.hasAttribute('aria-label')).toBe(false);
    expect(document.querySelector('.game-card svg')).not.toBeNull();
    card.click();
    expect(app().dataset.screen).toBe('number-quest/map');
    expect(document.querySelectorAll('.stone')).toHaveLength(6);
    expect(document.querySelectorAll('.stone.locked')).toHaveLength(5);
  });

  it('plays level 1 on the number line, with dots, clouds and spoken clues', async () => {
    document.querySelector('.stone:not(.locked)').click();
    expect(app().dataset.screen).toBe('number-quest/play');
    await flush(400);
    expect(lastSpoken()).toBe('Can you guess it?');
    expect(spokenText()).toContain("I'm thinking of a number from 1 to 5.");
    expect(document.querySelectorAll('.num-tile')).toHaveLength(5);
    expect(tile(3).querySelectorAll('.dot-on')).toHaveLength(3);
    expect(document.querySelector('.pad')).toBeNull();
    // Voice answers are off unless a grown-up switches them on.
    expect(document.querySelector('.mic-button').hidden).toBe(true);
    expect(recognition.calls.instances).toHaveLength(0);

    for (let round = 0; round < 3; round += 1) {
      const guesses = await playRoundByHalving(async (n) => {
        tile(n).click();
        // Every guess is spoken: "3?" then the clue.
        expect(spokenText().slice(-2)[0]).toBe(`${n}${lastSpoken().startsWith('You found') ? '!' : '?'}`);
        if (lastSpoken() === 'Higher!') {
          for (let k = 1; k <= n; k += 1) expect(tile(k).classList.contains('cloud'), `tile ${k}`).toBe(true);
          expect(tile(1).disabled).toBe(true);
        }
      });
      expect(guesses).toBeLessThanOrEqual(3);
      await flush(6000);
    }
    expect(app().dataset.screen).toBe('number-quest/complete');
    expect(document.querySelectorAll('.big-star.earned')).toHaveLength(3);
    expect(document.querySelector('.tally').textContent).toMatch(/Numbers found3/);
  });

  it('saved stars, unlocked level 2 and kept number-skill stats', () => {
    const saved = JSON.parse(localStorage.getItem('pips-playroom'));
    const q = saved.profiles[0].games['number-quest'];
    expect(q.unlocked).toBe(2);
    expect(q.levels['1'].stars).toBe(3);
    expect(q.totalScore).toBeGreaterThan(0);
    expect(q.stats.rounds).toBe(3);
    expect(q.stats.guesses).toBeGreaterThanOrEqual(3);
    expect(q.stats.best).toBe(9);
  });

  it('does not count a tap on a number behind a cloud, and remembers the mix-up', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.95); // Pip picks 10
    go('number-quest/play', { levelId: 2 });
    await flush(400);
    random.mockRestore();
    tile(5).click();
    expect(lastSpoken()).toBe('Higher!');
    expect(tile(2).disabled).toBe(true);
    // A ruled-out tile is disabled; typing its number on the keyboard reaches it anyway.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(lastSpoken()).toBe('Remember, my number is higher than 5.');
    expect(document.querySelectorAll('.track-flag')).toHaveLength(1); // not counted
  });

  it('offers Pip’s hint (never forced) and points at the middle', async () => {
    ctx.record.settings.games['number-quest'].unlockAll = true;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.4); // Pip picks 13
    go('number-quest/play', { levelId: 4 }); // 1–30, hint after 3 guesses
    await flush(400);
    random.mockRestore();
    const hint = document.querySelector('.hint-button');
    for (const n of [1, 30]) {
      tile(n).click();
      expect(hint.hidden).toBe(true);
    }
    tile(2).click();
    expect(hint.hidden).toBe(false);
    hint.click();
    expect(spokenText().slice(-2)).toEqual(['Try a number in the middle!', 'How about 16?']);
    expect(document.querySelector('.num-tile.hinted').dataset.n).toBe('16');
    // Ignoring the hint is fine: the round carries on as normal.
    tile(10).click();
    expect(lastSpoken()).toBe('Higher!');
  });

  it('uses the number pad on 1–100, and the line narrows', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Pip picks 91
    go('number-quest/play', { levelId: 6 });
    await flush(400);
    random.mockRestore();
    expect(document.querySelector('.num-tiles')).toBeNull();
    const keys = [...document.querySelectorAll('.pad-key')];
    expect(keys).toHaveLength(12);
    const press = (label) => keys.find((k) => k.getAttribute('aria-label') === label).click();
    press('5');
    press('0');
    expect(document.querySelector('.pad-display').textContent).toBe('50');
    press('Guess');
    expect(spokenText().slice(-2)).toEqual(['50?', 'Higher!']);
    expect(document.querySelector('.range-label').textContent).toBe('It’s between 51 and 100.');
    expect(document.querySelector('.track-cloud-left').style.width).toBe('50%');
    expect(document.querySelector('.track-cloud-right').style.width).toBe('0%');
    press('9');
    press('5');
    press('Guess');
    expect(lastSpoken()).toBe('Lower!');
    expect(document.querySelector('.range-label').textContent).toBe('It’s between 51 and 94.');
    // Out of range is never counted.
    press('Delete');
    for (const d of ['1', '0', '9']) press(d);
    press('Guess');
    expect(lastSpoken()).toBe('Pick a number from 1 to 100.');
    expect(document.querySelectorAll('.track-flag')).toHaveLength(2);
  });

  it('listens on-device only, after a grown-up switches voice answers on and the child taps the mic', async () => {
    ctx.record.settings.games['number-quest'].voiceInput = true;
    go('number-quest/play', { levelId: 3 });
    await flush(400);
    const mic = document.querySelector('.mic-button');
    expect(mic.hidden).toBe(false);
    expect(recognition.calls.instances).toHaveLength(0); // no microphone yet
    mic.click();
    const rec = recognition.calls.instances[0];
    expect(rec.processLocally).toBe(true);
    expect(rec.started).toBe(true);
    expect(mic.classList.contains('listening')).toBe(true);
    expect(mic.textContent).toMatch(/Listening/);
    rec.hear('ten', 'tin');
    expect(spokenText().slice(-2)[0]).toMatch(/^10[?!]$/);
    expect(mic.classList.contains('listening')).toBe(false);
  });

  it('keeps the microphone hidden when on-device recognition is unavailable', async () => {
    recognition.setStatus('unavailable');
    go('number-quest/play', { levelId: 3 });
    await flush(400);
    expect(document.querySelector('.mic-button').hidden).toBe(true);
  });

  it('never made a network request other than its own level data', () => {
    expect(requests).toEqual(DATA_URLS);
  });
});
