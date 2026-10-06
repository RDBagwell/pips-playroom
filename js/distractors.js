// Choosing the wrong answers shown next to the right one.
//
// Difficulty is not just about harder words: *which* wrong choices appear
// matters as much. Modes:
//   different-start  distractors start with other letters (practise first sounds)
//   rhyme            distractors from the same word family (cat / hat / bat)
//   look-alike       distractors share the first letter or most of the spelling
//   mixed            half look-alike, half anything from the level
//
// Pure and deterministic given `rng`, so it is easy to test.

import { normalizeWord } from './text.js';

export const MODES = ['different-start', 'rhyme', 'look-alike', 'mixed'];

// Words that sound the same would make the game unfair: the child hears "two"
// and cannot know whether we meant "to". A target never appears next to its
// homophones, and tests check the word lists never contain both.
export const HOMOPHONES = [
  ['to', 'two', 'too'], ['for', 'four'], ['I', 'eye'], ['see', 'sea'], ['be', 'bee'],
  ['no', 'know'], ['one', 'won'], ['some', 'sum'], ['son', 'sun'], ['here', 'hear'],
  ['there', 'their'], ['where', 'wear'], ['would', 'wood'], ['your', 'yore'],
  ['by', 'bye', 'buy'], ['road', 'rode'], ['nose', 'knows'], ['rose', 'rows'],
  ['tail', 'tale'], ['sail', 'sale'], ['mail', 'male'], ['pail', 'pale'], ['rain', 'reign'],
  ['meet', 'meat'], ['feet', 'feat'], ['week', 'weak'], ['night', 'knight'], ['blue', 'blew'],
  ['red', 'read'], ['made', 'maid'], ['hole', 'whole'], ['right', 'write'], ['wait', 'weight'],
  ['which', 'witch'], ['new', 'knew'], ['not', 'knot'], ['flour', 'flower'], ['bear', 'bare'],
  ['deer', 'dear'], ['fur', 'fir'], ['hi', 'high'], ['eight', 'ate'], ['plum', 'plumb'],
  ['toad', 'towed'], ['tea', 'tee'], ['pair', 'pear'], ['herd', 'heard'], ['knit', 'nit'],
];

// Words spelled one way but spoken two ways. Never use them.
export const HETERONYMS = ['read', 'live', 'lead', 'wind', 'tear', 'bow', 'close', 'does', 'wound', 'row', 'dove', 'minute', 'use'];

const homophoneIndex = new Map();
for (const group of HOMOPHONES) {
  for (const w of group) homophoneIndex.set(w, group);
}

export function areHomophones(a, b) {
  const g = homophoneIndex.get(a);
  return Boolean(g && a !== b && g.includes(b));
}

const VOWELS = 'aeiou';

/** The part of the word from the first vowel on: c|at, sh|ip, tr|ain. */
export function rime(word) {
  const w = word.toLowerCase();
  for (let i = 0; i < w.length; i += 1) {
    if (VOWELS.includes(w[i]) || (w[i] === 'y' && i > 0)) return w.slice(i);
  }
  return w;
}

export function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

function commonSuffix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1;
  return i;
}

const first = (w) => w[0].toLowerCase();

/** How much two words look alike, 0..~10. */
export function similarity(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const maxLen = Math.max(x.length, y.length);
  const closeness = 1 - levenshtein(x, y) / maxLen;
  return commonPrefix(x, y) * 1.5 + closeness * 4 + (x.length === y.length ? 1 : 0);
}

/** Does `cand` satisfy `mode` for this target? */
export function matchesMode(mode, target, cand) {
  switch (mode) {
    case 'different-start':
      return first(cand) !== first(target);
    case 'rhyme':
      return rime(cand) === rime(target);
    case 'look-alike': {
      const x = target.toLowerCase();
      const y = cand.toLowerCase();
      return first(x) === first(y) || 1 - levenshtein(x, y) / Math.max(x.length, y.length) >= 0.5;
    }
    default:
      return true;
  }
}

// Ranking used to sort candidates within a group: higher is a better fit.
function rankFor(mode, target, cand) {
  if (mode === 'rhyme') return commonSuffix(target, cand) * 2 + similarity(target, cand) / 10;
  if (mode === 'look-alike') return similarity(target, cand);
  return 0;
}

function shuffled(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanPool(words, exclude) {
  const out = [];
  const seen = new Set(exclude);
  for (const raw of words) {
    const w = normalizeWord(raw);
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/**
 * Candidates ordered best-first for `mode`:
 *   1. level words that match the mode
 *   2. other level words, closest fit first
 *   3. earlier-level words (a top-up, used only when the level runs short)
 * Within each group: best rank first, ties broken randomly.
 */
function ordered(mode, target, level, extra, rng) {
  const sortGroup = (list) =>
    shuffled(list, rng)
      .map((w, i) => ({ w, i, r: rankFor(mode, target, w) }))
      .sort((a, b) => b.r - a.r || a.i - b.i)
      .map((x) => x.w);
  const split = (list) => [
    list.filter((w) => matchesMode(mode, target, w)),
    list.filter((w) => !matchesMode(mode, target, w)),
  ];
  const [lm, ln] = split(level);
  const [em, en] = split(extra);
  return [...sortGroup(lm), ...sortGroup(ln), ...sortGroup(em), ...sortGroup(en)];
}

/**
 * Pick `count` wrong choices for `target`.
 * @param {string} target
 * @param {object} opts
 * @param {string[]} opts.pool      words from this level
 * @param {string[]} [opts.extraPool] words from earlier levels (top-up)
 * @param {number} opts.count       how many distractors (cards - 1)
 * @param {string} opts.mode        one of MODES
 * @param {() => number} [opts.rng]
 */
export function pickDistractors(target, { pool, extraPool = [], count, mode, rng = Math.random }) {
  if (!MODES.includes(mode)) throw new Error(`Unknown distractor mode: ${mode}`);
  const t = normalizeWord(target);
  const exclude = [t, ...(homophoneIndex.get(t) || [])];
  const level = cleanPool(pool, exclude);
  const extra = cleanPool(extraPool, [...exclude, ...level]);
  if (level.length + extra.length < count) {
    throw new Error(`Not enough words to pick ${count} distractors for "${t}"`);
  }

  if (mode === 'different-start') {
    // Prefer choices that also start differently from each other, so every
    // card on screen begins with its own sound.
    const order = ordered(mode, t, level, extra, rng);
    const picked = [];
    const starts = new Set([first(t)]);
    for (const w of order) {
      if (picked.length === count) break;
      if (!starts.has(first(w))) {
        picked.push(w);
        starts.add(first(w));
      }
    }
    for (const w of order) {
      if (picked.length === count) break;
      if (!picked.includes(w)) picked.push(w);
    }
    return picked;
  }

  if (mode === 'mixed') {
    const lookCount = Math.ceil(count / 2);
    const picked = ordered('look-alike', t, level, extra, rng).slice(0, lookCount);
    const rest = shuffled(level.filter((w) => !picked.includes(w)), rng).concat(
      shuffled(extra.filter((w) => !picked.includes(w)), rng),
    );
    return picked.concat(rest.slice(0, count - picked.length));
  }

  return ordered(mode, t, level, extra, rng).slice(0, count);
}
