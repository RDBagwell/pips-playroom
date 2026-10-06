// Understanding a number said out loud, as speech recognition writes it down:
// "7", "seven", "seventy two", "seventy-two", "a hundred", "one hundred and
// five", "it's 12!", "number nine please". Pure, so it is easy to test.

// Prototype-free lookups, so a word like "constructor" is never a number.
const dict = (o) => Object.freeze(Object.assign(Object.create(null), o));

const UNITS = dict({ zero: 0, oh: 0, nought: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 });
const TEENS = dict({
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
});
const TENS = dict({ twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 });

// Words a recogniser often writes instead of a number when a child says one
// number on its own ("for" for four). Only used when nothing else in what
// was heard is a number, so "I want to say five" is still five.
const SOUNDS_LIKE = dict({ to: 2, too: 2, for: 4, fore: 4, won: 1, ate: 8, free: 3, tree: 3, nein: 9, tin: 10 });

const isDigits = (t) => /^\d+$/.test(t);
const small = (t) => (t in UNITS ? UNITS[t] : t in TEENS ? TEENS[t] : isDigits(t) && Number(t) < 10 ? Number(t) : null);

function tokens(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/(\d),(\d{3})/g, '$1$2') // 1,000 → 1000
    .replace(/[-‐–]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Read a number starting at tokens[i]. Returns { value, next } or null. */
function readNumber(t, i) {
  let j = i;
  let value = 0;
  let any = false;

  // [a | one | two ... nine] hundred [and]
  const lead = t[j] === 'a' ? 1 : small(t[j]);
  if (lead !== null && lead > 0 && lead < 10 && t[j + 1] === 'hundred') {
    value = lead * 100;
    j += 2;
    any = true;
    if (t[j] === 'and') j += 1;
  } else if (t[j] === 'hundred') {
    value = 100;
    j += 1;
    any = true;
    if (t[j] === 'and') j += 1;
  }

  // tens [unit] | teen | unit | digits
  const tok = t[j];
  if (tok in TENS) {
    value += TENS[tok];
    j += 1;
    any = true;
    const unit = t[j] in UNITS ? UNITS[t[j]] : isDigits(t[j] || '') && Number(t[j]) < 10 ? Number(t[j]) : null;
    if (unit !== null && unit > 0) {
      value += unit;
      j += 1;
    }
  } else if (tok in TEENS || tok in UNITS) {
    value += tok in TEENS ? TEENS[tok] : UNITS[tok];
    j += 1;
    any = true;
  } else if (tok !== undefined && isDigits(tok) && (!any || Number(tok) < 100)) {
    value += Number(tok);
    j += 1;
    any = true;
  } else if (any && t[j - 1] === 'and') {
    j -= 1; // "a hundred and" with nothing after: leave "and" alone
  }
  return any ? { value, next: j } : null;
}

/**
 * The first number in what was heard, or null.
 *   parseSpokenNumber('seventy two') → 72
 *   parseSpokenNumber('a hundred')   → 100
 *   parseSpokenNumber('banana')      → null
 */
export function parseSpokenNumber(text) {
  const t = tokens(text);
  for (let i = 0; i < t.length; i += 1) {
    const tok = t[i];
    const startsNumber = isDigits(tok) || tok in UNITS || tok in TEENS || tok in TENS || tok === 'hundred'
      || (tok === 'a' && t[i + 1] === 'hundred');
    if (!startsNumber) continue;
    const found = readNumber(t, i);
    if (found && Number.isSafeInteger(found.value)) return found.value;
  }
  // Nothing that's clearly a number: try a sound-alike, but only if it's the only one.
  const alikes = t.filter((w) => w in SOUNDS_LIKE);
  return alikes.length === 1 ? SOUNDS_LIKE[alikes[0]] : null;
}

/**
 * Choose from the recogniser's alternatives (best first): the first that is
 * a number inside min..max, else the first number at all, else null.
 */
export function bestSpokenNumber(alternatives, { min = -Infinity, max = Infinity } = {}) {
  const numbers = (alternatives || []).map(parseSpokenNumber).filter((n) => n !== null);
  return numbers.find((n) => n >= min && n <= max) ?? numbers[0] ?? null;
}
