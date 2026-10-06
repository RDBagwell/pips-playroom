import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  makeFact, makeQuestion, distractors, equationText, equationWords, questionSpeech, explanation,
  factFamily, familyLabel, ceilingOf,
} from '../../games/math-garden/questions.js';
import { normalizeMathLevels } from '../../games/math-garden/levels.js';
import { numberToWords } from '../../core/number-words.js';
import { seeded } from '../helpers/rng.js';

const levels = normalizeMathLevels(JSON.parse(readFileSync(new URL('../../data/math-garden/levels.json', import.meta.url), 'utf8')));

/** Is `x` a believable mistake for this fact? */
function plausible(f, x) {
  const d = Math.abs(x - f.answer);
  switch (f.skill) {
    case 'tens': return d % 10 === 0 || d <= 2;
    case 'times': return x % f.a === 0 || x === f.a + f.b || d <= 2;
    case 'add': return d <= 3 || x === Math.abs(f.a - f.b);
    case 'sub': return d <= 3 || x === f.a + f.b;
    case 'doubles':
    case 'bonds': return d <= 3 || x === f.a;
    default: return d <= 3;
  }
}

function checkFact(f, spec) {
  switch (spec.skill) {
    case 'count':
      expect(f.answer).toBe(f.a);
      expect(f.a).toBeGreaterThanOrEqual(1);
      expect(f.a).toBeLessThanOrEqual(spec.max);
      break;
    case 'add':
      expect(f.answer).toBe(f.a + f.b);
      expect(f.answer).toBeLessThanOrEqual(spec.max);
      expect(f.answer).toBeGreaterThanOrEqual(spec.min ?? 2);
      expect(Math.min(f.a, f.b)).toBeGreaterThanOrEqual(1);
      break;
    case 'sub':
      expect(f.answer).toBe(f.a - f.b);
      expect(f.a).toBeLessThanOrEqual(spec.max);
      expect(f.a).toBeGreaterThanOrEqual(spec.min ?? 2);
      expect(f.b).toBeGreaterThanOrEqual(1);
      break;
    case 'doubles':
      expect(f.a).toBe(f.b);
      expect(f.answer).toBe(f.a * 2);
      expect(f.answer).toBeLessThanOrEqual(spec.max);
      break;
    case 'bonds':
      expect(f.a + f.answer).toBe(spec.total);
      expect(f.a).toBeGreaterThanOrEqual(1);
      expect(f.answer).toBeGreaterThanOrEqual(1);
      break;
    case 'tens':
      expect(f.a % 10).toBe(0);
      expect(f.b % 10).toBe(0);
      expect(f.answer).toBe(f.a + f.b);
      expect(f.answer).toBeLessThanOrEqual(spec.max);
      expect(Math.min(f.a, f.b)).toBeGreaterThanOrEqual(10);
      break;
    case 'times':
      expect(spec.tables).toContain(f.a);
      expect(f.answer).toBe(f.a * f.b);
      expect(f.b).toBeGreaterThanOrEqual(1);
      expect(f.b).toBeLessThanOrEqual(spec.upTo ?? 10);
      break;
    default:
      throw new Error(spec.skill);
  }
  expect(f.answer).toBeGreaterThanOrEqual(0);
}

describe('questions for every level', () => {
  for (const level of levels) {
    it(`${level.id}. ${level.name}: correct answers, plausible distinct choices, in range`, () => {
      const rng = seeded(level.id);
      for (const spec of level.skills) {
        for (let i = 0; i < 300; i += 1) {
          const fact = makeFact(spec, rng);
          checkFact(fact, spec);
          const pick = makeQuestion(fact, { kind: 'pick', choices: level.choices, rng, object: level.object });
          expect(pick.choices).toHaveLength(level.choices);
          expect(new Set(pick.choices).size).toBe(level.choices);
          expect(pick.choices).toContain(fact.answer);
          expect([...pick.choices].sort((a, b) => a - b)).toEqual(pick.choices);
          for (const c of pick.choices) {
            expect(Number.isInteger(c)).toBe(true);
            expect(c).toBeGreaterThanOrEqual(spec.skill === 'count' ? 1 : 0);
            expect(c).toBeLessThanOrEqual(ceilingOf(spec));
          }
          const wrong = pick.choices.filter((c) => c !== fact.answer);
          // Most wrong choices must be believable mistakes (the rest are nearby top-ups).
          expect(wrong.filter((c) => plausible(fact, c)).length).toBeGreaterThanOrEqual(wrong.length - 1);
          const no = makeQuestion(fact, { kind: 'truefalse', isTrue: false, rng });
          expect(no.shown).not.toBe(fact.answer);
          expect(no.shown).toBeGreaterThanOrEqual(0);
          expect(no.shown).toBeLessThanOrEqual(ceilingOf(spec));
          expect(plausible(fact, no.shown)).toBe(true);
          const yes = makeQuestion(fact, { kind: 'truefalse', isTrue: true, rng });
          expect(yes.shown).toBe(fact.answer);
        }
      }
    });
  }
});

describe('distractors', () => {
  it('prefers one off and the swapped operation', () => {
    expect(distractors({ skill: 'add', a: 3, b: 2, answer: 5, ceiling: 10 }, 3)).toEqual([6, 4, 1]);
    expect(distractors({ skill: 'sub', a: 7, b: 3, answer: 4, ceiling: 10 }, 3)).toEqual([5, 3, 10]);
    expect(distractors({ skill: 'tens', a: 20, b: 30, answer: 50, ceiling: 100 }, 3)).toEqual([60, 40, 51]);
    expect(distractors({ skill: 'times', a: 5, b: 4, answer: 20, ceiling: 50 }, 3)).toEqual([25, 15, 9]);
  });

  it('skips a swapped operation that would just be zero', () => {
    expect(distractors({ skill: 'add', a: 5, b: 5, answer: 10, ceiling: 10 }, 2)).toEqual([9, 8]);
  });

  it('never goes below zero (or one when counting) or above the range', () => {
    expect(distractors({ skill: 'count', a: 1, b: 0, answer: 1, ceiling: 5 }, 3)).toEqual([2, 3, 4]);
    expect(distractors({ skill: 'sub', a: 2, b: 2, answer: 0, ceiling: 5 }, 3)).toEqual([1, 4, 2]);
    expect(distractors({ skill: 'add', a: 4, b: 1, answer: 5, ceiling: 5 }, 3)).toEqual([4, 3, 2]);
  });

  it('refuses a range too small for the choices', () => {
    expect(() => distractors({ skill: 'count', a: 1, b: 0, answer: 1, ceiling: 2 }, 3)).toThrow(/Not enough/);
  });
});

describe('reading equations naturally', () => {
  it('says numbers as words', () => {
    expect([0, 7, 13, 20, 42, 99, 100, 105, 1000].map(numberToWords)).toEqual([
      'zero', 'seven', 'thirteen', 'twenty', 'forty-two', 'ninety-nine', 'one hundred', 'one hundred and five', 'one thousand',
    ]);
    expect(numberToWords(-1)).toBe('-1');
  });

  it('writes and reads each kind of equation', () => {
    const add = { skill: 'add', a: 3, b: 2, answer: 5 };
    expect(equationText(add)).toBe('3 + 2 = ?');
    expect(equationWords(add, 5)).toBe('three plus two equals five');
    expect(equationText({ skill: 'sub', a: 7, b: 3, answer: 4 }, 4)).toBe('7 − 3 = 4');
    expect(equationWords({ skill: 'sub', a: 7, b: 3, answer: 4 }, 4)).toBe('seven take away three equals four');
    expect(equationText({ skill: 'bonds', a: 7, b: 10, answer: 3 })).toBe('7 + ? = 10');
    expect(equationText({ skill: 'times', a: 2, b: 6, answer: 12 })).toBe('2 × 6 = ?');
    expect(equationWords({ skill: 'times', a: 2, b: 6, answer: 12 }, 12)).toBe('two times six equals twelve');
  });

  it('asks out loud', () => {
    expect(questionSpeech({ skill: 'add', a: 4, b: 3, answer: 7, kind: 'pick' })).toEqual(['What is four plus three?']);
    expect(questionSpeech({ skill: 'add', a: 3, b: 2, answer: 5, kind: 'truefalse', shown: 6 })).toEqual(['Is this right?', 'Three plus two equals six.']);
    expect(questionSpeech({ skill: 'bonds', a: 7, b: 10, answer: 3, kind: 'pick' })).toEqual(['Seven plus what makes ten?']);
    expect(questionSpeech({ skill: 'count', a: 1, answer: 1, kind: 'truefalse', shown: 1, object: 'leaf' })).toEqual(['Is this right?', 'There is one leaf.']);
    expect(questionSpeech({ skill: 'count', a: 4, answer: 4, kind: 'pick', object: 'leaf' })).toEqual(['How many leaves can you count?']);
  });

  it('explains by counting with the picture', () => {
    expect(explanation({ skill: 'count', a: 5, answer: 5 })).toEqual({ lines: ["Let's count: one, two, three, four, five.", "It's five!"], count: 5 });
    expect(explanation({ skill: 'add', a: 3, b: 2, answer: 5 }).count).toBe(5);
    expect(explanation({ skill: 'add', a: 9, b: 6, answer: 15 })).toMatchObject({ count: 0 });
    expect(explanation({ skill: 'sub', a: 7, b: 3, answer: 4 }).lines[0]).toMatch(/count what's left: one, two, three, four/);
    expect(explanation({ skill: 'times', a: 2, b: 5, answer: 10 }).lines[0]).toBe("Two rows of five. Let's count by fives: five, ten.");
    expect(explanation({ skill: 'tens', a: 20, b: 30, answer: 50 }).lines).toEqual(['Two tens and three tens make five tens.', "That's fifty!"]);
  });
});

describe('fact families', () => {
  it('groups related facts for the grown-ups', () => {
    expect(factFamily({ skill: 'add', a: 4, b: 3, answer: 7 })).toBe('3+4=7');
    expect(factFamily({ skill: 'add', a: 3, b: 4, answer: 7 })).toBe('3+4=7');
    expect(factFamily({ skill: 'sub', a: 7, b: 3, answer: 4 })).toBe('3+4=7');
    expect(factFamily({ skill: 'sub', a: 7, b: 4, answer: 3 })).toBe('3+4=7');
    expect(factFamily({ skill: 'bonds', a: 7, b: 10, answer: 3 })).toBe('3+7=10');
    expect(factFamily({ skill: 'times', a: 5, b: 2, answer: 10 })).toBe('2×5=10');
    expect(factFamily({ skill: 'count', a: 6, answer: 6 })).toBe('count 6');
    expect(familyLabel('3+4=7')).toBe('3 + 4 = 7  ·  7 − 4 = 3');
    expect(familyLabel('2×5=10')).toBe('2 × 5 = 10  ·  5 × 2 = 10');
    expect(familyLabel('count 6')).toBe('Counting 6 things');
  });
});
