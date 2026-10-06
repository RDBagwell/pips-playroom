import { describe, it, expect } from 'vitest';
import { typedChar, matches, capsLockOn, fingerFor, keyName, spokenKey, onKeyboard, HALVES, HOME_ROW } from '../../games/typing/keys.js';
import { createTyping, typeChar, nextChar, accuracy, typingStars, wordsPerMinute, pickItems, pointsFor } from '../../games/typing/session.js';
import { needsKeyboardCard, pointerFacts, noteKeyPress, hasSeenKeyPress, resetKeyPress } from '../../games/typing/detect.js';
import { seeded } from '../helpers/rng.js';

const key = (k, extra = {}) => ({ key: k, repeat: false, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...extra });
const withState = (k, states, extra = {}) => key(k, { ...extra, getModifierState: (m) => states.includes(m) });

describe('reading a key press', () => {
  it('turns ordinary keys into characters', () => {
    expect(typedChar(key('a'))).toBe('a');
    expect(typedChar(key(' '))).toBe(' ');
    expect(typedChar(key('Spacebar'))).toBe(' ');
    expect(typedChar(key('.'))).toBe('.');
  });

  it('accepts Shift and Caps Lock: the letter still counts', () => {
    expect(typedChar(key('A', { shiftKey: true }))).toBe('A');
    expect(matches('A', 'a')).toBe(true);
    const caps = withState('C', ['CapsLock']);
    expect(typedChar(caps)).toBe('C');
    expect(matches(typedChar(caps), 'c')).toBe(true);
    expect(capsLockOn(caps)).toBe(true);
    expect(capsLockOn(key('c'))).toBe(false);
    // ...and a capital in the text accepts a small letter too ("I").
    expect(matches('i', 'I')).toBe(true);
  });

  it('ignores auto-repeat from a held-down key', () => {
    expect(typedChar(key('a', { repeat: true }))).toBeNull();
  });

  it('ignores modifiers, shortcuts and keys that would delete or move', () => {
    for (const k of ['Shift', 'CapsLock', 'Control', 'Alt', 'Meta', 'Tab', 'Dead', 'Unidentified', 'Process', 'Backspace', 'Delete', 'Enter', 'ArrowLeft', 'Escape', 'F5']) {
      expect(typedChar(key(k)), k).toBeNull();
    }
    expect(typedChar(key('c', { ctrlKey: true }))).toBeNull();
    expect(typedChar(key('v', { metaKey: true }))).toBeNull();
    expect(typedChar(key('a', { altKey: true }))).toBeNull();
    // AltGr (European keyboards) still types.
    expect(typedChar(withState('@', ['AltGraph'], { altKey: true, ctrlKey: false }))).toBe('@');
    expect(typedChar(null)).toBeNull();
  });

  it('matches punctuation and spaces exactly', () => {
    expect(matches('.', '.')).toBe(true);
    expect(matches(',', '.')).toBe(false);
    expect(matches(' ', ' ')).toBe(true);
    expect(matches('b', 'd')).toBe(false);
  });
});

describe('the keyboard picture', () => {
  it('has every letter once, and a finger for every key', () => {
    const all = HALVES.flat(2);
    expect(all.filter((k) => /[a-z]/.test(k)).sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    for (const k of [...all, ' ']) expect(fingerFor(k), k).not.toBeNull();
    expect(fingerFor('f')).toBe('left-index');
    expect(fingerFor('J')).toBe('right-index');
    expect(fingerFor('a')).toBe('left-little');
    expect(fingerFor(' ')).toBe('thumb');
    expect(onKeyboard('!')).toBe(false);
    expect([...HOME_ROW].map(fingerFor)).toEqual(['left-little', 'left-ring', 'left-middle', 'left-index', 'right-index', 'right-middle', 'right-ring']);
  });

  it('names keys for people and for Pip', () => {
    expect([' ', '.', 'a', 'Q'].map(keyName)).toEqual(['space', 'full stop', 'a', 'q']);
    expect(spokenKey('a')).toBe('A');
    expect(spokenKey(' ')).toBe('space');
  });
});

describe('typing a word', () => {
  it('moves on with each right letter and ignores wrong ones without deleting', () => {
    const t = createTyping('cat');
    expect(nextChar(t)).toBe('c');
    expect(typeChar(t, 'c')).toBe('correct');
    expect(typeChar(t, 'x')).toBe('wrong');
    expect(t.index).toBe(1); // nothing lost
    expect(typeChar(t, 'A')).toBe('correct');
    expect(typeChar(t, 't')).toBe('done');
    expect(typeChar(t, 't')).toBe('ignored');
    expect(t).toMatchObject({ correct: 3, wrong: 1, misses: { a: 1 }, done: true });
    expect(pointsFor(t)).toBe(3);
    expect(typeChar(createTyping('a'), null)).toBe('ignored');
  });

  it('types sentences with spaces and a full stop', () => {
    const t = createTyping('a cat.');
    for (const c of 'a cat.') typeChar(t, c);
    expect(t.done).toBe(true);
    expect(t.wrong).toBe(0);
  });
});

describe('accuracy and stars', () => {
  it('stars come from accuracy, never speed, and finishing earns at least one', () => {
    expect(accuracy(0, 0)).toBe(1);
    expect(accuracy(9, 1)).toBeCloseTo(0.9);
    expect(typingStars(10, 0)).toBe(3);
    expect(typingStars(9, 1)).toBe(3);
    expect(typingStars(8, 2)).toBe(2);
    expect(typingStars(3, 1)).toBe(2);
    expect(typingStars(7, 3)).toBe(1);
    expect(typingStars(1, 50)).toBe(1);
  });

  it('works out words per minute as information', () => {
    expect(wordsPerMinute(50, 60000)).toBe(10);
    expect(wordsPerMinute(25, 30000)).toBe(10);
    expect(wordsPerMinute(0, 1000)).toBe(0);
    expect(wordsPerMinute(10, 0)).toBe(0);
  });

  it('picks items without the same one twice in a row', () => {
    const rng = seeded(4);
    for (let i = 0; i < 50; i += 1) {
      const items = pickItems(['a', 'b', 'c'], 10, rng);
      expect(items).toHaveLength(10);
      for (let j = 1; j < items.length; j += 1) expect(items[j]).not.toBe(items[j - 1]);
    }
    expect(pickItems(['x'], 3)).toEqual(['x', 'x', 'x']);
  });
});

describe('is there a keyboard?', () => {
  it('shows the card only for touch-only devices, until a key is pressed', () => {
    // Phone or tablet: a finger is the only pointer.
    expect(needsKeyboardCard({ coarse: true, anyFine: false })).toBe(true);
    // Laptop or desktop.
    expect(needsKeyboardCard({ coarse: false, anyFine: true })).toBe(false);
    // Touchscreen laptop or tablet with a trackpad: there is a fine pointer too.
    expect(needsKeyboardCard({ coarse: true, anyFine: true })).toBe(false);
    // A tablet whose keyboard has just been used.
    expect(needsKeyboardCard({ coarse: true, anyFine: false, sawKey: true })).toBe(false);
    // Unknown: assume a keyboard rather than block the game.
    expect(needsKeyboardCard({})).toBe(false);
  });

  it('reads the pointer facts from media queries', () => {
    const win = { matchMedia: (q) => ({ matches: q === '(pointer: coarse)' }) };
    expect(pointerFacts(win)).toEqual({ coarse: true, anyFine: false });
    expect(pointerFacts({})).toEqual({ coarse: false, anyFine: false });
  });

  it('remembers a real key press for the visit', () => {
    resetKeyPress();
    expect(hasSeenKeyPress()).toBe(false);
    noteKeyPress();
    expect(hasSeenKeyPress()).toBe(true);
    resetKeyPress();
  });
});
