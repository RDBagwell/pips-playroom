// Is there a physical keyboard? Browsers can't say for sure, so the game
// makes a sensible guess and lets the child correct it:
//  - any real key press proves there is a keyboard (the card goes away);
//  - otherwise a device whose only pointer is coarse (a finger on a phone or
//    tablet) probably has no keyboard, so it shows a friendly card instead of
//    the game, with a "tap the keys" practice mode;
//  - everything else (mouse, trackpad, pen, hybrids with a trackpad) is
//    assumed to have one.
// The game never focuses a text field, so the device's own on-screen
// keyboard never pops up.

/** Pure: should the "This game needs a keyboard" card show? */
export function needsKeyboardCard({ coarse = false, anyFine = false, sawKey = false } = {}) {
  if (sawKey) return false;
  return coarse && !anyFine;
}

/** Read the pointer facts from the browser. */
export function pointerFacts(win = globalThis) {
  const mq = (q) => Boolean(win.matchMedia && win.matchMedia(q).matches);
  return { coarse: mq('(pointer: coarse)'), anyFine: mq('(any-pointer: fine)') };
}

// Remembered for this visit: once a real key has been pressed, we know.
let sawKey = false;

export function noteKeyPress() {
  sawKey = true;
}

export function hasSeenKeyPress() {
  return sawKey;
}

/** For tests. */
export function resetKeyPress() {
  sawKey = false;
}
