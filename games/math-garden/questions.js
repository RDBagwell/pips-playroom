// Math Garden questions. Pure and deterministic given `rng`, so every level's
// questions can be checked by the tests.
//
// Two styles, mixed per level in data:
//   pick       "4 + 3 = ?" with three or four answers to choose from
//   truefalse  "3 + 2 = 5": is it right? (a big ✔ or ✘)
//
// The wrong answers are chosen on purpose, like the Reading Game's
// distractors: one off, the operation swapped (3 + 2 shown as 1), a tens or
// times-table neighbour. Never negative, never equal to the answer, never twice.

import { numberToWords as w } from '../../core/number-words.js';

export const SKILLS = ['count', 'add', 'sub', 'doubles', 'bonds', 'tens', 'times'];
export const MINUS = '−';
export const TIMES = '×';

const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];

/**
 * A fact for one skill: { skill, a, b, answer }.
 *   count   {max}            how many objects (a), 1..max
 *   add     {max, min?}      a + b, the total within max (and at least min)
 *   sub     {max, min?}      a − b, a within max, never below zero
 *   doubles {max}            a + a, the total within max
 *   bonds   {total}          a + ? = total (the answer is the missing part)
 *   tens    {max}            tens + tens, within max (20 + 30)
 *   times   {tables, upTo}   a × b, a from the tables, b up to upTo
 */
export function makeFact(spec, rng = Math.random) {
  return { ...rawFact(spec, rng), ceiling: ceilingOf(spec) };
}

/** The biggest number a level's answers (and so its choices) may reach. */
export function ceilingOf(spec) {
  switch (spec.skill) {
    case 'bonds':
      return spec.total;
    case 'times':
      return Math.max(...spec.tables) * (spec.upTo ?? 10);
    default:
      return spec.max;
  }
}

function rawFact(spec, rng) {
  switch (spec.skill) {
    case 'count': {
      const a = randInt(rng, 1, spec.max);
      return { skill: 'count', a, b: 0, answer: a };
    }
    case 'add': {
      const total = randInt(rng, Math.max(spec.min ?? 2, 2), spec.max);
      const a = randInt(rng, 1, total - 1);
      return { skill: 'add', a, b: total - a, answer: total };
    }
    case 'sub': {
      const a = randInt(rng, Math.max(spec.min ?? 2, 2), spec.max);
      const b = randInt(rng, 1, a - 1);
      return { skill: 'sub', a, b, answer: a - b };
    }
    case 'doubles': {
      const a = randInt(rng, 1, Math.floor(spec.max / 2));
      return { skill: 'doubles', a, b: a, answer: a + a };
    }
    case 'bonds': {
      const a = randInt(rng, 1, spec.total - 1);
      return { skill: 'bonds', a, b: spec.total, answer: spec.total - a };
    }
    case 'tens': {
      const totalTens = randInt(rng, 2, Math.floor(spec.max / 10));
      const at = randInt(rng, 1, totalTens - 1);
      return { skill: 'tens', a: at * 10, b: (totalTens - at) * 10, answer: totalTens * 10 };
    }
    case 'times': {
      const a = pickOne(rng, spec.tables);
      const b = randInt(rng, 1, spec.upTo ?? 10);
      return { skill: 'times', a, b, answer: a * b };
    }
    default:
      throw new Error(`Unknown skill: ${spec.skill}`);
  }
}

/** Plausible wrong answers for a fact, most convincing first (may repeat or be invalid; see distractors()). */
function candidates(f) {
  const { a, b, answer: n } = f;
  switch (f.skill) {
    case 'count':
      return [n + 1, n - 1, n + 2, n - 2];
    case 'add':
      return [n + 1, n - 1, Math.abs(a - b), n + 2, n - 2];
    case 'sub':
      return [n + 1, n - 1, a + b, n + 2, n - 2];
    case 'doubles':
      return [n + 1, n - 1, a, n + 2, n - 2];
    case 'bonds':
      return [n + 1, n - 1, a, n + 2, n - 2];
    case 'tens':
      return [n + 10, n - 10, n + 1, n - 1, n + 20, n - 20];
    case 'times':
      return [a * (b + 1), a * (b - 1), a + b, a * (b - 2), a * (b + 2), n + 1, n - 1];
    default:
      return [];
  }
}

/** The smallest a choice may be: counting starts at one, everything else at zero. */
const floorFor = (skill) => (skill === 'count' ? 1 : 0);

/**
 * `count` distinct wrong answers: never the answer, never negative, never
 * above the level's range. Ranked plausible first; topped up with nearby
 * numbers if needed.
 */
export function distractors(fact, count) {
  const out = [];
  const ceiling = fact.ceiling ?? Infinity;
  const ok = (x) => Number.isInteger(x) && x >= floorFor(fact.skill) && x <= ceiling && x !== fact.answer && !out.includes(x);
  for (const x of candidates(fact)) {
    if (out.length === count) break;
    if (ok(x)) out.push(x);
  }
  // Tens stay tens where possible; everything else steps out one at a time.
  const step = fact.skill === 'tens' ? 10 : 1;
  for (let k = 1; out.length < count && k <= 200; k += 1) {
    for (const x of [fact.answer + k * step, fact.answer - k * step, fact.answer + k, fact.answer - k]) {
      if (out.length < count && ok(x)) out.push(x);
    }
  }
  if (out.length < count) throw new Error(`Not enough choices for ${factKey(fact)} within 0 to ${ceiling}`);
  return out;
}

/** The fact as an equation, with `?` or a shown answer: "4 + 3 = ?", "7 + ? = 10". */
export function equationText(f, shown = null) {
  const ans = shown === null ? '?' : String(shown);
  switch (f.skill) {
    case 'count':
      return ans;
    case 'sub':
      return `${f.a} ${MINUS} ${f.b} = ${ans}`;
    case 'bonds':
      return `${f.a} + ${ans} = ${f.b}`;
    case 'times':
      return `${f.a} ${TIMES} ${f.b} = ${ans}`;
    default:
      return `${f.a} + ${f.b} = ${ans}`;
  }
}

/** The same, read aloud naturally: "three plus two equals five". */
export function equationWords(f, shown = null) {
  const ans = shown === null ? 'what' : w(shown);
  switch (f.skill) {
    case 'sub':
      return `${w(f.a)} take away ${w(f.b)} equals ${ans}`;
    case 'bonds':
      return `${w(f.a)} plus ${ans} makes ${w(f.b)}`;
    case 'times':
      return `${w(f.a)} times ${w(f.b)} equals ${ans}`;
    default:
      return `${w(f.a)} plus ${w(f.b)} equals ${ans}`;
  }
}

/**
 * A question for one fact.
 *   kind 'pick':      { choices: [...] } in counting order (smallest first)
 *   kind 'truefalse': { shown, isTrue }   a false one shows a plausible wrong answer
 */
export function makeQuestion(fact, { kind, isTrue = true, choices = 3, rng = Math.random, object = 'apple' }) {
  const q = { ...fact, kind, object, key: factKey(fact) };
  if (kind === 'pick') {
    q.choices = [fact.answer, ...distractors(fact, choices - 1)].sort((x, y) => x - y);
    q.text = equationText(fact);
  } else {
    q.isTrue = isTrue;
    // A false statement uses one of the two most convincing wrong answers.
    q.shown = isTrue ? fact.answer : pickOne(rng, distractors(fact, 2));
    q.text = equationText(fact, q.shown);
  }
  q.speech = questionSpeech(q);
  return q;
}

export function objectName(object, n) {
  const names = { apple: ['apple', 'apples'], shell: ['shell', 'shells'], star: ['star', 'stars'], flower: ['flower', 'flowers'], bee: ['bee', 'bees'], leaf: ['leaf', 'leaves'] };
  const [one, many] = names[object] || ['thing', 'things'];
  return n === 1 ? one : many;
}

/** What Pip says to ask the question. */
export function questionSpeech(q) {
  if (q.skill === 'count') {
    return q.kind === 'pick'
      ? [`How many ${objectName(q.object, 2)} can you count?`]
      : ['Is this right?', `There ${q.shown === 1 ? 'is' : 'are'} ${w(q.shown)} ${objectName(q.object, q.shown)}.`];
  }
  if (q.kind === 'pick') {
    return q.skill === 'bonds' ? [`${cap(w(q.a))} plus what makes ${w(q.b)}?`] : [`What is ${equationWords(q).replace(/ equals what$/, '')}?`];
  }
  return ['Is this right?', `${cap(equationWords(q, q.shown))}.`];
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * How Pip explains the answer after a wrong tap, counting along with the
 * picture where the numbers are small enough to count.
 * Returns { lines, count } where `count` (if any) is how many objects to
 * light up one by one while Pip counts.
 */
export function explanation(q) {
  const n = q.answer;
  const counting = (upTo) => Array.from({ length: upTo }, (_, i) => w(i + 1)).join(', ');
  switch (q.skill) {
    case 'count':
      return { lines: [`Let's count: ${counting(n)}.`, `It's ${w(n)}!`], count: n };
    case 'add':
    case 'doubles':
      return n <= 10
        ? { lines: [`Let's count them all: ${counting(n)}.`, `${cap(equationWords(q, n))}!`], count: n }
        : { lines: [`Start at ${w(q.a)} and count on ${w(q.b)}.`, `${cap(equationWords(q, n))}!`], count: 0 };
    case 'sub':
      return n <= 10
        ? { lines: [`${cap(w(q.a))}, and ${w(q.b)} go away. Let's count what's left: ${counting(n)}.`, `It's ${w(n)}!`], count: n }
        : { lines: [`${cap(w(q.a))} take away ${w(q.b)} leaves ${w(n)}.`, `${cap(equationWords(q, n))}!`], count: 0 };
    case 'bonds':
      return { lines: [`Let's count the empty spaces: ${counting(n)}.`, `${cap(equationWords(q, n))}!`], count: n };
    case 'tens':
      return { lines: [`${cap(w(q.a / 10))} tens and ${w(q.b / 10)} tens make ${w(n / 10)} tens.`, `That's ${w(n)}!`], count: 0 };
    case 'times': {
      const steps = Array.from({ length: q.a }, (_, i) => w(q.b * (i + 1))).join(', ');
      return { lines: [`${cap(w(q.a))} rows of ${w(q.b)}. Let's count by ${w(q.b)}s: ${steps}.`, `${cap(equationWords(q, n))}!`], count: 0 };
    }
    default:
      return { lines: [`It's ${w(n)}!`], count: 0 };
  }
}

/** A stable key for a fact, used for review and the grown-ups' tricky list. */
export function factKey(f) {
  return `${f.skill}:${f.a}:${f.b}`;
}

/**
 * The fact family a fact belongs to, for the grown-ups' "tricky" list:
 * 3 + 4, 4 + 3, 7 − 3 and 7 − 4 are all the family "3+4=7".
 */
export function factFamily(f) {
  switch (f.skill) {
    case 'count':
      return `count ${f.answer}`;
    case 'add':
    case 'doubles':
    case 'tens':
      return `${Math.min(f.a, f.b)}+${Math.max(f.a, f.b)}=${f.answer}`;
    case 'sub':
      return `${Math.min(f.b, f.answer)}+${Math.max(f.b, f.answer)}=${f.a}`;
    case 'bonds':
      return `${Math.min(f.a, f.answer)}+${Math.max(f.a, f.answer)}=${f.b}`;
    case 'times':
      return `${Math.min(f.a, f.b)}×${Math.max(f.a, f.b)}=${f.answer}`;
    default:
      return factKey(f);
  }
}

/** "3+4=7" → "3 + 4 = 7, 7 − 4 = 3"; "2×6=12" → "2 × 6 = 12, 12 ÷ 2 = 6". For grown-ups. */
export function familyLabel(key) {
  const count = key.match(/^count (\d+)$/);
  if (count) return `Counting ${count[1]} things`;
  const m = key.match(/^(\d+)([+×])(\d+)=(\d+)$/);
  if (!m) return key;
  const [, a, op, b, c] = m;
  return op === '+'
    ? `${a} + ${b} = ${c}  ·  ${c} ${MINUS} ${b} = ${a}`
    : `${a} ${TIMES} ${b} = ${c}  ·  ${b} ${TIMES} ${a} = ${c}`;
}
