// @vitest-environment jsdom
// End-to-end through the real screens, with speech mocked and no network.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMockWindow, VOICES } from '../helpers/mockSpeech.js';

const data = {
  './data/reading/levels.json': JSON.parse(readFileSync(`${process.cwd()}/data/reading/levels.json`, 'utf8')),
  './data/number-quest/levels.json': JSON.parse(readFileSync(`${process.cwd()}/data/number-quest/levels.json`, 'utf8')),
};
let mock;
const requests = [];

const flush = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
};
const app = () => document.getElementById('app');
const lastSpoken = () => mock.spoken[mock.spoken.length - 1].text;
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));

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
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return { ok: url in data, status: url in data ? 200 : 404, json: async () => data[url] };
  };
  await import('../../core/main.js');
  await flush(10);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('the game', () => {
  it('starts on a "Tap to play" screen and speaks only after the tap', async () => {
    expect(app().dataset.screen).toBe('start');
    expect(mock.spoken).toHaveLength(0);
    button('Tap to play').click();
    expect(mock.spoken.length).toBeGreaterThan(0);
    expect(app().dataset.screen).toBe('new-profile');
  });

  it('creates a reader, rendering the name as text', async () => {
    const input = document.getElementById('reader-name');
    input.value = '<img src=x>';
    button("Let's go").click();
    expect(app().dataset.screen).toBe('new-profile');
    expect(document.querySelector('.form-error').textContent).toMatch(/letters only/);
    input.value = 'Ava';
    button("Let's go").click();
    // The playroom: Pip greets the reader by name, then they choose the Reading Game.
    expect(app().dataset.screen).toBe('hub');
    expect(lastSpoken()).toBe('Hi, Ava! What would you like to play?');
    expect(document.querySelectorAll('.game-card')).toHaveLength(2);
    document.querySelector('.game-card[data-game="reading"]').click();
    expect(app().dataset.screen).toBe('reading/map');
    expect(document.querySelector('.player-name').textContent).toBe('Ava');
    expect(document.querySelectorAll('.stone')).toHaveLength(12);
    expect(document.querySelectorAll('.stone.locked')).toHaveLength(11);
  });

  it('plays level 1 to the end, with a correction on a wrong tap', async () => {
    document.querySelector('.stone:not(.locked)').click();
    expect(app().dataset.screen).toBe('reading/play');
    await flush(400);
    let wrongDone = false;
    for (let q = 0; q < 8; q += 1) {
      const target = lastSpoken();
      const cards = [...document.querySelectorAll('.card')];
      expect(cards).toHaveLength(3);
      expect(cards.map((c) => c.dataset.word)).toContain(target);
      if (!wrongDone) {
        const wrong = cards.find((c) => c.dataset.word !== target);
        wrong.click();
        const said = mock.spoken.slice(-3).map((u) => u.text);
        expect(said).toEqual([`That word is ${wrong.dataset.word}.`, 'Find the word…', target]);
        expect(wrong.classList.contains('tried')).toBe(true);
        wrongDone = true;
      }
      cards.find((c) => c.dataset.word === target).click();
      await flush(5000);
    }
    expect(app().dataset.screen).toBe('reading/complete');
    expect(document.querySelector('.complete-title').textContent).toMatch(/Level complete/);
  });

  it('saved progress and unlocked level 2', async () => {
    const saved = JSON.parse(localStorage.getItem('pips-playroom'));
    const p = saved.profiles[0];
    expect(p.name).toBe('Ava');
    expect(p.games.reading.unlocked).toBe(2);
    expect(p.games.reading.levels['1'].stars).toBeGreaterThanOrEqual(1);
    expect(p.games.reading.totalScore).toBeGreaterThan(0);
    // The word missed on purpose is remembered for the grown-ups' progress view.
    expect(Object.keys(p.games.reading.tricky)).toHaveLength(1);
    expect(localStorage.getItem('reading-game')).toBeNull();
    button('Map').click();
    expect(document.querySelectorAll('.stone.locked')).toHaveLength(10);
  });

  it('never made a network request other than its own level data', () => {
    expect(requests).toEqual(['./data/reading/levels.json', './data/number-quest/levels.json']);
  });
});
