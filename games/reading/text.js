// How words look on the cards.

/** Lowercase by default (how early readers are taught), except "I". */
export function formatWord(word, wordCase = 'lower') {
  const w = String(word);
  if (w.toLowerCase() === 'i') return 'I';
  if (wordCase === 'title') return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return w.toLowerCase();
}

/** The form used for comparisons and storage. */
export function normalizeWord(word) {
  const w = String(word).trim();
  return w.toLowerCase() === 'i' ? 'I' : w.toLowerCase();
}
