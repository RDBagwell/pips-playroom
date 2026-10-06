import { describe, it, expect } from 'vitest';
import { pickTarget, createRound, nextQuestion, answer, isComplete, REVIEW_GAP } from '../js/round.js';
import { seeded } from './helpers/rng.js';

const level = {
  id: 1,
  words: 'cat hat bat rat map sad man can fan pan'.split(' '),
  cards: 3,
  distractors: 'different-start',
  goal: 8,
};

describe('pickTarget', () => {
  it('never repeats the previous target', () => {
    const rng = seeded(5);
    let last = null;
    for (let i = 0; i < 500; i += 1) {
      const t = pickTarget(['a', 'b'], { last, rng });
      expect(t).not.toBe(last);
      last = t;
    }
  });

  it('avoids recently asked words when it can', () => {
    const rng = seeded(9);
    for (let i = 0; i < 100; i += 1) {
      const t = pickTarget(['a', 'b', 'c', 'd'], { last: 'a', recent: ['b', 'c'], rng });
      expect(t).toBe('d');
    }
  });

  it('handles tiny pools', () => {
    expect(pickTarget(['only'], { last: 'only' })).toBe('only');
    expect(() => pickTarget([])).toThrow();
  });
});

describe('a round', () => {
  it('asks a question with the target among shuffled choices', () => {
    const round = createRound(level, { rng: seeded(1) });
    const { target, choices } = nextQuestion(round);
    expect(choices).toHaveLength(3);
    expect(choices).toContain(target);
  });

  it('never asks the same word twice in a row', () => {
    const round = createRound(level, { rng: seeded(2) });
    let last = null;
    for (let i = 0; i < 200; i += 1) {
      const { target } = nextQuestion(round);
      expect(target).not.toBe(last);
      last = target;
      answer(round, target);
    }
  });

  it('completes after `goal` correct answers', () => {
    const round = createRound(level, { rng: seeded(3) });
    for (let i = 0; i < 7; i += 1) {
      nextQuestion(round);
      expect(answer(round, round.target).done).toBe(false);
    }
    nextQuestion(round);
    expect(answer(round, round.target).done).toBe(true);
    expect(isComplete(round)).toBe(true);
    expect(round.firstTry).toBe(8);
  });

  it('brings a missed word back later in the round', () => {
    const round = createRound(level, { rng: seeded(4) });
    const { target: missed, choices } = nextQuestion(round);
    const wrong = choices.find((c) => c !== missed);
    expect(answer(round, wrong).correct).toBe(false);
    expect(answer(round, missed).correct).toBe(true);
    expect(round.missed).toEqual([missed]);

    const asked = [];
    for (let i = 0; i < REVIEW_GAP; i += 1) {
      asked.push(nextQuestion(round).target);
      answer(round, round.target);
    }
    expect(asked[REVIEW_GAP - 1]).toBe(missed);
    // Only once: it leaves the review queue after being asked.
    expect(round.review).toHaveLength(0);
  });

  it('queues a missed word only once even after several wrong taps', () => {
    const round = createRound(level, { rng: seeded(6) });
    const { target, choices } = nextQuestion(round);
    const wrongs = choices.filter((c) => c !== target);
    answer(round, wrongs[0]);
    answer(round, wrongs[1]);
    expect(round.review).toHaveLength(1);
  });

  it('never subtracts points, and scores by attempt', () => {
    const round = createRound(level, { rng: seeded(8) });
    const { target, choices } = nextQuestion(round);
    const wrong = choices.find((c) => c !== target);
    expect(answer(round, wrong).points).toBe(0);
    expect(answer(round, wrong).points).toBe(0);
    expect(round.score).toBe(0);
    expect(answer(round, target).points).toBe(2);
    expect(round.score).toBe(2);
  });

  it('adds a streak bonus for consecutive first-try answers', () => {
    const round = createRound(level, { rng: seeded(10) });
    const results = [];
    for (let i = 0; i < 3; i += 1) {
      nextQuestion(round);
      results.push(answer(round, round.target));
    }
    expect(results.map((r) => r.bonus)).toEqual([0, 2, 4]);
    expect(round.score).toBe(36);
    expect(round.bestStreak).toBe(3);
  });
});
