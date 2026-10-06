// The keyboard, finger zones and keystroke matching for Type with Pip.
// Pure (no DOM), so every rule is easy to test.

/** A QWERTY keyboard as two halves, one per hand: [left rows, right rows]. */
export const HALVES = [
  [['q', 'w', 'e', 'r', 't'], ['a', 's', 'd', 'f', 'g'], ['z', 'x', 'c', 'v', 'b']],
  [['y', 'u', 'i', 'o', 'p'], ['h', 'j', 'k', 'l', ';'], ['n', 'm', ',', '.']],
];

export const HOME_ROW = 'asdfjkl';

/** Which finger presses each key (standard touch typing). */
const FINGER_KEYS = {
  'left-little': 'qaz',
  'left-ring': 'wsx',
  'left-middle': 'edc',
  'left-index': 'rfvtgb',
  'right-index': 'yhnujm',
  'right-middle': 'ik,',
  'right-ring': 'ol.',
  'right-little': 'p;',
  thumb: ' ',
};

export const FINGER_NAMES = {
  'left-little': 'left little finger',
  'left-ring': 'left ring finger',
  'left-middle': 'left middle finger',
  'left-index': 'left pointer finger',
  'right-index': 'right pointer finger',
  'right-middle': 'right middle finger',
  'right-ring': 'right ring finger',
  'right-little': 'right little finger',
  thumb: 'thumb',
};

/** The finger for a character, or null for one that isn't on the picture. */
export function fingerFor(char) {
  const c = String(char).toLowerCase();
  for (const [finger, keys] of Object.entries(FINGER_KEYS)) if (keys.includes(c)) return finger;
  return null;
}

/** Every character the game can ask for is on the keyboard picture. */
export function onKeyboard(char) {
  return fingerFor(char) !== null;
}

/** A key's name for people: "a", "space", "full stop". */
export function keyName(char) {
  return { ' ': 'space', '.': 'full stop', ',': 'comma', ';': 'semicolon' }[char] || String(char).toLowerCase();
}

/** What Pip calls a letter out loud: capitals are read as letter names ("A" is "ay", not "uh"). */
export function spokenKey(char) {
  return /^[a-z]$/i.test(char) ? char.toUpperCase() : keyName(char);
}

const IGNORED = new Set(['Shift', 'CapsLock', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Tab', 'Dead', 'Unidentified', 'Process', 'Compose', 'NumLock', 'ScrollLock', 'Fn', 'FnLock', 'Hyper', 'Super', 'Symbol', 'SymbolLock', 'ContextMenu']);

/**
 * Turn a keydown event (or something shaped like one) into the character
 * typed, or null when it should be ignored:
 *  - held-down auto-repeat never counts (no "aaaaaa"),
 *  - modifier keys on their own, shortcuts (Ctrl/⌘) and non-character
 *    keys like Backspace, Enter or the arrows are ignored, so nothing the
 *    child has typed is ever deleted,
 *  - Shift and Caps Lock are fine: they change the case, which is matched
 *    without caring about case.
 */
export function typedChar(e) {
  if (!e || e.repeat) return null;
  if (e.ctrlKey || e.metaKey) return null;
  const altGraph = typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
  if (e.altKey && !altGraph) return null;
  const key = e.key === 'Spacebar' ? ' ' : e.key;
  if (typeof key !== 'string' || IGNORED.has(key)) return null;
  return [...key].length === 1 ? key : null;
}

/** Is `typed` the character we wanted? Letters match in either case. */
export function matches(typed, expected) {
  if (typed === expected) return true;
  return /^[a-z]$/i.test(expected) && typed.toLowerCase() === expected.toLowerCase();
}

/** True when Caps Lock is on (so the game can say that's fine). */
export function capsLockOn(e) {
  return Boolean(e && typeof e.getModifierState === 'function' && e.getModifierState('CapsLock'));
}
