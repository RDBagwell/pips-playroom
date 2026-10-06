// Things the game says. Varied so it never feels robotic.

export const PRAISE = [
  'Great job!',
  'You got it!',
  'Awesome reading!',
  'Yes! That is it!',
  'Super!',
  'Way to go!',
  'Wonderful!',
  'Nice reading!',
];

export function pickPraise(rng = Math.random, last = null) {
  const options = PRAISE.filter((p) => p !== last);
  return options[Math.floor(rng() * options.length)];
}

export function askPhrases(word) {
  return ['Find the word…', word];
}

export function correctionPhrases(tapped, target) {
  return [`That word is ${tapped}.`, 'Find the word…', target];
}
