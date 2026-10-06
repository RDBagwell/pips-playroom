// One play-through of a Math Garden level: which question next, missed
// questions coming back later, and counting answers. Pure, with `rng`.

import { makeFact, makeQuestion, factKey } from './questions.js';
import { accuracyStars } from '../../core/scoring.js';

/** Ask a missed question again after this many other questions. */
export const REVIEW_GAP = 3;
export const POINTS = { firstTry: 10, secondTry: 5, later: 2 };

export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * The question styles for a round, decided up front so true/false questions
 * are balanced: as many true as false (give or take one), shuffled.
 */
export function planKinds(goal, trueFalseShare, rng = Math.random) {
  const tf = Math.round(goal * trueFalseShare);
  const truths = Array.from({ length: tf }, (_, i) => i % 2 === 0);
  // When there's an odd one out, it's equally likely to be true or false.
  if (tf % 2 === 1 && rng() < 0.5) truths[tf - 1] = false;
  const plan = [
    ...truths.map((isTrue) => ({ kind: 'truefalse', isTrue })),
    ...Array.from({ length: goal - tf }, () => ({ kind: 'pick' })),
  ];
  return shuffle(plan, rng);
}

export function createRound(level, { rng = Math.random } = {}) {
  return {
    levelId: level.id,
    level,
    rng,
    plan: planKinds(level.goal, level.trueFalse, rng),
    questionNo: 0,
    correct: 0,
    firstTry: 0,
    score: 0,
    attempts: 0,
    question: null,
    recent: [],
    review: [], // [{ question, due }]
    missed: [], // questions missed on the first try
  };
}

/** A fresh question that isn't one of the last few. */
function freshQuestion(round, slot) {
  const { level, rng } = round;
  let q;
  for (let tries = 0; tries < 25; tries += 1) {
    const spec = level.skills[Math.floor(rng() * level.skills.length)];
    const fact = makeFact(spec, rng);
    q = makeQuestion(fact, { ...slot, choices: level.choices, rng, object: level.object });
    if (!round.recent.includes(q.key)) break;
  }
  return q;
}

/** Advance to the next question. */
export function nextQuestion(round) {
  round.questionNo += 1;
  const last = round.question;
  const dueIndex = round.review.findIndex((r) => r.due <= round.questionNo && (!last || r.question.key !== last.key));
  let q;
  if (dueIndex >= 0) {
    q = round.review[dueIndex].question;
    round.review.splice(dueIndex, 1);
  } else {
    const slot = round.plan[round.correct % round.plan.length];
    q = freshQuestion(round, slot);
  }
  round.recent = [...round.recent, q.key].slice(-4);
  round.question = q;
  round.attempts = 0;
  return q;
}

export function isRight(q, value) {
  return q.kind === 'truefalse' ? value === q.isTrue : value === q.answer;
}

export function pointsForAnswer(attempts) {
  if (attempts <= 1) return POINTS.firstTry;
  if (attempts === 2) return POINTS.secondTry;
  return POINTS.later;
}

/** Record a tap. Wrong answers cost nothing; the question comes back later. */
export function answer(round, value) {
  round.attempts += 1;
  const q = round.question;
  if (!isRight(q, value)) {
    if (round.attempts === 1) {
      if (!round.missed.some((m) => m.key === q.key)) round.missed.push(q);
      if (!round.review.some((r) => r.question.key === q.key)) {
        round.review.push({ question: q, due: round.questionNo + REVIEW_GAP });
      }
    }
    return { correct: false, points: 0 };
  }
  const firstTry = round.attempts === 1;
  round.correct += 1;
  if (firstTry) round.firstTry += 1;
  const points = pointsForAnswer(round.attempts);
  round.score += points;
  return { correct: true, firstTry, points, done: isComplete(round) };
}

export function isComplete(round) {
  return round.correct >= round.level.goal;
}

/** Stars from first-try accuracy; finishing always earns one. */
export function roundStars(round) {
  return accuracyStars(round.firstTry, round.level.goal);
}

export { factKey };
