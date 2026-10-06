import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { planKinds, createRound, nextQuestion, answer, isRight, roundStars, pointsForAnswer, REVIEW_GAP } from '../../games/math-garden/round.js';
import { validateMathLevels, normalizeMathLevels } from '../../games/math-garden/levels.js';
import { seeded } from '../helpers/rng.js';

const raw = JSON.parse(readFileSync(new URL('../../data/math-garden/levels.json', import.meta.url), 'utf8'));
const levels = normalizeMathLevels(raw);

describe('true / false balance', () => {
  it('asks about as many true as false, every time', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const [goal, share] of [[8, 0.5], [8, 0.25], [7, 0.5], [10, 0.3]]) {
        const plan = planKinds(goal, share, seeded(seed));
        expect(plan).toHaveLength(goal);
        const tf = plan.filter((p) => p.kind === 'truefalse');
        expect(tf).toHaveLength(Math.round(goal * share));
        const yes = tf.filter((p) => p.isTrue).length;
        expect(Math.abs(yes - (tf.length - yes))).toBeLessThanOrEqual(1);
      }
    }
  });

  it('splits an odd one either way over many rounds', () => {
    let trueExtra = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const tf = planKinds(6, 0.5, seeded(seed)).filter((p) => p.kind === 'truefalse');
      if (tf.filter((p) => p.isTrue).length === 2) trueExtra += 1;
    }
    expect(trueExtra).toBeGreaterThan(120);
    expect(trueExtra).toBeLessThan(280);
  });
});

describe('a round', () => {
  const answerRight = (q) => (q.kind === 'truefalse' ? q.isTrue : q.answer);
  const answerWrong = (q) => (q.kind === 'truefalse' ? !q.isTrue : q.choices.find((c) => c !== q.answer));

  it('finishes after the goal, with first-try stars', () => {
    const round = createRound(levels[3], { rng: seeded(4) });
    let n = 0;
    while (!round.correct || round.correct < levels[3].goal) {
      const q = nextQuestion(round);
      const r = answer(round, answerRight(q));
      expect(r.correct).toBe(true);
      n += 1;
    }
    expect(n).toBe(8);
    expect(round.score).toBe(80);
    expect(roundStars(round)).toBe(3);
  });

  it('brings a missed question back after a few others and never costs points', () => {
    const round = createRound(levels[2], { rng: seeded(7) });
    const first = nextQuestion(round);
    expect(answer(round, answerWrong(first))).toEqual({ correct: false, points: 0 });
    expect(round.score).toBe(0);
    expect(answer(round, answerRight(first))).toMatchObject({ correct: true, firstTry: false, points: 5 });
    const seen = [];
    for (let i = 0; i < REVIEW_GAP; i += 1) {
      const q = nextQuestion(round);
      seen.push(q.key);
      answer(round, answerRight(q));
    }
    expect(seen.slice(-1)[0]).toBe(first.key);
    expect(round.missed.map((q) => q.key)).toEqual([first.key]);
  });

  it('gives at least one star even when everything was missed first', () => {
    const round = createRound(levels[0], { rng: seeded(2) });
    while (round.correct < levels[0].goal) {
      const q = nextQuestion(round);
      answer(round, answerWrong(q));
      answer(round, answerRight(q));
    }
    expect(round.firstTry).toBe(0);
    expect(roundStars(round)).toBe(1);
    expect(round.score).toBe(40);
  });

  it('scores 10 / 5 / 2 and checks both kinds of answer', () => {
    expect([1, 2, 3, 9].map(pointsForAnswer)).toEqual([10, 5, 2, 2]);
    expect(isRight({ kind: 'truefalse', isTrue: false }, false)).toBe(true);
    expect(isRight({ kind: 'truefalse', isTrue: false }, true)).toBe(false);
    expect(isRight({ kind: 'pick', answer: 7 }, 7)).toBe(true);
  });
});

describe('data/math-garden/levels.json', () => {
  it('passes validation', () => {
    expect(validateMathLevels(raw)).toEqual([]);
  });

  it('follows the early-maths ladder', () => {
    const ladder = levels.map((l) => l.skills.map((s) => s.skill).join('+'));
    expect(ladder).toEqual([
      'count', 'count', 'add', 'add', 'sub', 'doubles', 'bonds', 'add', 'sub', 'tens', 'times',
      'add+sub+doubles+bonds+tens+times',
    ]);
    expect(levels.slice(0, 2).map((l) => l.skills[0].max)).toEqual([5, 10]);
    expect(levels[10].skills[0].tables).toEqual([2, 5, 10]);
    expect(new Set(levels.map((l) => l.name)).size).toBe(12);
  });

  it('fades the pictures out as the levels rise', () => {
    const order = { always: 0, help: 1, none: 2 };
    const fade = levels.map((l) => order[l.pictures]);
    expect(fade).toEqual([...fade].sort((a, b) => a - b));
    expect(fade[0]).toBe(0);
    expect(fade.at(-1)).toBe(2);
  });

  it('names each problem in plain words', () => {
    const ok = { id: 1, name: 'T', focus: 'F', skills: [{ skill: 'add', max: 10 }], trueFalse: 0.5, choices: 3 };
    const errs = (lvl) => validateMathLevels({ levels: [lvl] }).join('\n');
    expect(errs(ok)).toBe('');
    expect(errs({ ...ok, choices: 5 })).toMatch(/"choices"/);
    expect(errs({ ...ok, trueFalse: 2 })).toMatch(/"trueFalse"/);
    expect(errs({ ...ok, skills: [{ skill: 'divide' }] })).toMatch(/"skill"/);
    expect(errs({ ...ok, skills: [{ skill: 'add', max: 50 }] })).toMatch(/"max"/);
    expect(errs({ ...ok, skills: [{ skill: 'tens', max: 55 }] })).toMatch(/multiple of 10/);
    expect(errs({ ...ok, skills: [{ skill: 'times', tables: [12] }] })).toMatch(/"tables"/);
    expect(errs({ ...ok, pictures: 'sometimes' })).toMatch(/"pictures"/);
    expect(errs({ ...ok, object: 'dragon' })).toMatch(/"object"/);
    expect(validateMathLevels({})).toEqual(['levels.json must have a non-empty "levels" array']);
  });
});
