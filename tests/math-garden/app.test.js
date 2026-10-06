// @vitest-environment jsdom
// Math Garden end to end through the real screens, with speech mocked.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { DATA_URLS, fakeFetch } from '../helpers/games.js';
import { createMockWindow, VOICES } from '../helpers/mockSpeech.js';

let mock;
let ctx;
let go;
const requests = [];
const flush = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const app = () => document.getElementById('app');
const spoken = () => mock.spoken.map((u) => u.text);
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));

/** On a counting level the answer is how many objects are in the picture. */
function rightAndWrong() {
  const n = document.querySelectorAll('.picture .obj').length;
  const kind = document.querySelector('.math-answers').dataset.kind;
  const choices = [...document.querySelectorAll('.math-choice')];
  if (kind === 'pick') {
    return { right: choices.find((c) => Number(c.dataset.value) === n), wrong: choices.find((c) => Number(c.dataset.value) !== n), n };
  }
  const shown = Number(document.querySelector('.equation').textContent.replace('?', ''));
  const isTrue = shown === n;
  return { right: choices[isTrue ? 0 : 1], wrong: choices[isTrue ? 1 : 0], n, kind, isTrue, shown };
}

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
  globalThis.fetch = fakeFetch(requests);
  await import('../../core/main.js');
  ({ ctx } = await import('../../core/context.js'));
  ({ go } = await import('../../core/router.js'));
  await flush(10);
});

afterAll(() => vi.useRealTimers());

describe('Math Garden', () => {
  it('opens from the hub', () => {
    button('Tap to play').click();
    document.getElementById('reader-name').value = 'Ava';
    button("Let's go").click();
    document.querySelector('.game-card[data-game="math-garden"]').click();
    expect(app().dataset.screen).toBe('math-garden/map');
    expect(document.querySelectorAll('.stone')).toHaveLength(12);
  });

  it('plays the counting level to the end, counting along after a wrong tap', async () => {
    document.querySelector('.stone:not(.locked)').click();
    await flush(400);
    expect(document.querySelector('.picture-slot').hidden).toBe(false);
    expect(spoken().at(-1)).toMatch(/How many apples can you count\?|There (is|are) .* apples?\./);
    let explained = false;
    for (let i = 0; i < 8; i += 1) {
      const { right, wrong, n } = rightAndWrong();
      if (!explained) {
        wrong.click();
        expect(wrong.classList.contains('tried')).toBe(true);
        expect(spoken().join(' ')).toMatch(/count/i);
        expect(spoken().join(' ')).toContain(['one', 'two', 'three', 'four', 'five'].slice(0, n).join(', '));
        await flush(900 + n * 520);
        expect(document.querySelectorAll('.picture .counted')).toHaveLength(n);
        explained = true;
      }
      right.click();
      expect(right.classList.contains('correct')).toBe(true);
      await flush(5000);
    }
    // The missed question came back, so the round took more than eight questions to reach eight right.
    expect(app().dataset.screen).toBe('math-garden/complete');
    expect(document.querySelector('.tally').textContent).toMatch(/Questions right8/);
    expect(document.querySelector('.tally').textContent).toMatch(/First try7/);
  });

  it('saved the stars and the missed fact family for grown-ups', () => {
    const p = JSON.parse(localStorage.getItem('pips-playroom')).profiles[0].games['math-garden'];
    expect(p.unlocked).toBe(2);
    expect(p.levels['1'].stars).toBe(3);
    expect(Object.keys(p.tricky)).toHaveLength(1);
    expect(Object.keys(p.tricky)[0]).toMatch(/^count \d$/);
  });

  it('reads equations as words and offers ✔ / ✘ on an adding level', async () => {
    ctx.record.settings.games['math-garden'].unlockAll = true;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const before = mock.spoken.length;
    go('math-garden/play', { levelId: 3 });
    await flush(400);
    random.mockRestore();
    const text = document.querySelector('.equation').textContent;
    expect(text).toMatch(/^\d \+ \d = (\?|\d)$/);
    const said = spoken().slice(before).join(' ');
    expect(said).toMatch(/(What is|Is this right\?) [a-z ]*(one|two|three|four)/i);
    expect(said).not.toMatch(/\d/);
    expect(document.querySelectorAll('.picture .obj').length).toBeGreaterThan(1);
  });

  it('hides the pictures behind "Show me" on higher levels', async () => {
    go('math-garden/play', { levelId: 8 });
    await flush(400);
    expect(document.querySelector('.picture-slot').hidden).toBe(true);
    const showMe = document.querySelector('.show-me');
    expect(showMe.hidden).toBe(false);
    showMe.click();
    expect(document.querySelector('.picture-slot').hidden).toBe(false);
  });

  it('has no clock unless a grown-up turns on "Beat your own time", which only counts up', async () => {
    expect(document.querySelector('.stopwatch')).toBeNull();
    ctx.record.settings.games['math-garden'].sprint = true;
    go('math-garden/play', { levelId: 1 });
    await flush(400);
    const watch = document.querySelector('.stopwatch');
    expect(watch.textContent).toMatch(/0:00/);
    await flush(3000);
    expect(watch.textContent).toMatch(/0:03/);
    for (let i = 0; i < 8; i += 1) {
      rightAndWrong().right.click();
      await flush(5000);
    }
    expect(document.querySelector('.tally').textContent).toMatch(/Your time0:\d\d\.\d/);
    expect(document.querySelector('.tally').textContent).toMatch(/Your best time/);
    expect(document.querySelectorAll('.big-star.earned')).toHaveLength(3);
  });

  it('made no requests beyond its own data', () => {
    expect(requests).toEqual(DATA_URLS);
  });
});
