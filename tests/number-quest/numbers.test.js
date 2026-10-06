import { describe, it, expect } from 'vitest';
import { parseSpokenNumber, bestSpokenNumber } from '../../games/number-quest/numbers.js';

describe('understanding spoken numbers', () => {
  const cases = [
    ['7', 7], ['seven', 7], ['Seven.', 7], ['seventy two', 72], ['seventy-two', 72], ['Seventy–Two!', 72],
    ['72', 72], ['a hundred', 100], ['one hundred', 100], ['hundred', 100], ['100', 100],
    ['one hundred and five', 105], ['a hundred and', 100], ['twelve', 12], ['nineteen', 19], ['twenty', 20],
    ['forty', 40], ['fourty four', 44], ['ninety nine', 99], ['zero', 0], ['oh', 0],
    ["it's 12", 12], ['number nine please', 9], ['um I think fifty', 50], ['is it 33?', 33],
    ['twenty 1', 21], ['1,000', 1000],
  ];
  for (const [text, n] of cases) {
    it(`"${text}" → ${n}`, () => expect(parseSpokenNumber(text)).toBe(n));
  }

  it('reads the first number when a child says more than one', () => {
    expect(parseSpokenNumber('five no six')).toBe(5);
  });

  it('accepts sound-alikes only when nothing else is a number', () => {
    expect(parseSpokenNumber('for')).toBe(4);
    expect(parseSpokenNumber('to')).toBe(2);
    expect(parseSpokenNumber('ate')).toBe(8);
    expect(parseSpokenNumber('I want to say five')).toBe(5);
    expect(parseSpokenNumber('to for')).toBeNull(); // ambiguous
  });

  it('returns null for anything that is not a number', () => {
    for (const t of ['', 'banana', 'hello Pip', 'constructor', 'toString', '__proto__', null, undefined, 'a']) {
      expect(parseSpokenNumber(t), String(t)).toBeNull();
    }
  });

  it('picks the best of the recogniser alternatives for the range', () => {
    expect(bestSpokenNumber(['hi', 'eighty', 'eight'], { min: 1, max: 10 })).toBe(8);
    expect(bestSpokenNumber(['eighty', 'eight'], { min: 1, max: 100 })).toBe(80);
    expect(bestSpokenNumber(['two hundred'], { min: 1, max: 100 })).toBe(200);
    expect(bestSpokenNumber(['banana'], { min: 1, max: 100 })).toBeNull();
    expect(bestSpokenNumber(undefined)).toBeNull();
  });
});
