// @vitest-environment jsdom
// The playroom around the games: an old Reading Game player arrives, Pip
// greets them, and a grown-up uses the grown-ups' corner.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { GAME_IDS, DATA_URLS, fakeFetch } from '../helpers/games.js';
import { createMockWindow } from '../helpers/mockSpeech.js';

const read = (p) => readFileSync(`${process.cwd()}/${p}`, 'utf8');
const LEGACY = read('tests/fixtures/reading-game-v1.json');
// Only online English voices, like Chrome on a machine with no English OS voice.
const ONLINE_ONLY = [
  { name: 'Google US English', lang: 'en-US', voiceURI: 'Google US English', localService: false },
  { name: 'Anna', lang: 'de-DE', voiceURI: 'anna', localService: true, default: true },
];
let mock;

const flush = (ms = 0) => vi.advanceTimersByTimeAsync(ms);
const app = () => document.getElementById('app');
const lastSpoken = () => mock.spoken[mock.spoken.length - 1].text;
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const label = (text) => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === text);

beforeAll(async () => {
  vi.useFakeTimers();
  localStorage.setItem('reading-game', LEGACY);
  document.body.innerHTML = '<main id="app"></main>';
  mock = createMockWindow({ voices: ONLINE_ONLY });
  window.speechSynthesis = mock.synth;
  window.SpeechSynthesisUtterance = mock.win.SpeechSynthesisUtterance;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  window.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  Element.prototype.scrollIntoView = () => {};
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
  globalThis.fetch = fakeFetch();
  await import('../../core/main.js');
  await flush(10);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('the playroom', () => {
  it('welcomes old Reading Game players with their readers and stars', () => {
    button('Tap to play').click();
    expect(app().dataset.screen).toBe('profiles');
    expect(document.querySelector('.notice').textContent).toMatch(/from the Reading Game are all here/);
    const tiles = [...document.querySelectorAll('.profile-tile:not(.profile-new)')];
    expect(tiles.map((t) => t.querySelector('.profile-name').textContent)).toEqual(['Ava', 'Mary-Kate']);
    expect(tiles[0].querySelector('.profile-stars').textContent).toBe('★ 6');
    expect(localStorage.getItem('reading-game')).toBe(LEGACY);
  });

  it('greets the reader by name and shows stars per game and in all', () => {
    document.querySelector('.profile-tile').click();
    expect(app().dataset.screen).toBe('hub');
    const said = mock.spoken.slice(-3).map((u) => u.text);
    expect(said[0]).toBe('Hi, Ava! What would you like to play?');
    expect(document.querySelector('.speech-bubble').textContent).toBe('Hi, Ava! What would you like to play?');
    // Ava's 6 Reading Game stars already unlock 3 stickers (at 1, 3 and 5 stars): a celebration, once.
    expect(said.slice(1)).toEqual(['You got 3 new stickers!', 'Put it in your sticker book!']);
    expect(document.querySelector('.sticker-party h2').textContent).toBe('3 new stickers!');
    expect(document.querySelector('.sticker-banner').textContent).toMatch(/3 of 24 stickers · 2 more stars for the next sticker!/);
    expect(JSON.parse(localStorage.getItem('pips-playroom')).profiles[0].stickers.seen).toBe(3);
    expect(document.querySelector('.player-bar').textContent).toMatch(/6 in all/);
    const cards = [...document.querySelectorAll('.game-card')];
    expect(cards.map((c) => c.dataset.game)).toEqual(GAME_IDS);
    expect(cards[0].querySelector('.game-card-stars').textContent).toBe('★ 6 of 36');
    expect(cards[1].querySelector('.game-card-stars').textContent).toBe('★ 0 of 18');
    expect(document.title).toBe('Playroom · Pip’s Playroom');
  });

  it('keeps the imported settings in the Reading Game', async () => {
    document.querySelector('.game-card[data-game="reading"]').click();
    expect(app().dataset.screen).toBe('reading/map');
    expect(document.title).toBe('Level map · Reading Game');
    // unlockAll came over from the old record.
    expect(document.querySelectorAll('.stone.locked')).toHaveLength(0);
    label('Back to the playroom').click();
    expect(app().dataset.screen).toBe('hub');
  });

  it("opens the grown-ups' corner only after a 3-second hold", async () => {
    label('Grown-ups').click();
    expect(app().dataset.screen).toBe('gate');
    const hold = document.querySelector('.hold-button');
    hold.dispatchEvent(new Event('pointerdown'));
    await flush(1000);
    hold.dispatchEvent(new Event('pointerup'));
    await flush(3000);
    expect(app().dataset.screen).toBe('gate');
    hold.dispatchEvent(new Event('pointerdown'));
    await flush(3100);
    expect(app().dataset.screen).toBe('settings');
  });

  it('warns that the only English voice uses the internet', () => {
    const note = document.getElementById('voice-note');
    expect(note.hidden).toBe(false);
    expect(note.textContent).toMatch(/This voice uses the internet/);
    expect(note.textContent).toMatch(/no English voice of its own/);
    const groups = [...document.querySelectorAll('#voice optgroup')].map((g) => g.label);
    expect(groups).toEqual(['English · uses the internet', 'Other languages']);
  });

  it('shows each game’s own settings section', () => {
    const headings = [...document.querySelectorAll('.settings-section h2')].map((h) => h.textContent);
    expect(headings).toEqual(['Voice', 'Sounds', 'Games in the playroom', 'Readers', '📖 Reading Game', '🔢 Number Quest', '🌻 Math Garden', '⌨️ Type with Pip', 'Privacy']);
    expect(document.getElementById('case-title').checked).toBe(true);
    expect(document.body.textContent).toMatch(/were brought over on/);
  });

  it('shows a progress view per child, on screen only', () => {
    const row = [...document.querySelectorAll('.reader-row')].find((r) => r.textContent.includes('Ava'));
    [...row.querySelectorAll('button')].find((b) => b.textContent === 'Progress').click();
    expect(app().dataset.screen).toBe('progress');
    const reading = document.querySelector('.progress-game[aria-label="Reading Game"]');
    expect(reading.textContent).toMatch(/Levels completed3 of 12/);
    expect(reading.textContent).toMatch(/Words to practise/);
    const quest = document.querySelector('.progress-game[aria-label="Number Quest"]');
    expect(quest.textContent).toMatch(/Numbers to compare/);
    // No way to export, share, print or download it.
    const buttons = [...document.querySelectorAll('button')].map((b) => b.textContent).join(' ');
    expect(buttons).not.toMatch(/export|share|print|download|copy|send|email/i);
    expect(document.querySelectorAll('a[href]')).toHaveLength(0);
    label('Back to settings').click();
    expect(app().dataset.screen).toBe('settings');
  });

  it('lets a grown-up hide a game from the playroom', () => {
    const toggle = document.getElementById('show-number-quest');
    expect(toggle.checked).toBe(true);
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    label('Back to the game').click();
    expect(app().dataset.screen).toBe('hub');
    expect([...document.querySelectorAll('.game-card')].map((c) => c.dataset.game)).toEqual(GAME_IDS.filter((id) => id !== 'number-quest'));
    const saved = JSON.parse(localStorage.getItem('pips-playroom'));
    expect(saved.settings.hiddenGames).toEqual(['number-quest']);
  });
});
