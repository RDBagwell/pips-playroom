// Numbers as words, so Pip reads "3 + 2 = 5" as "three plus two equals five"
// rather than leaving it to each voice to guess. Pure.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0–1000 in words: 72 → "seventy-two", 105 → "one hundred and five". */
export function numberToWords(n) {
  if (!Number.isInteger(n) || n < 0 || n > 1000) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n === 1000) return 'one thousand';
  const rest = n % 100;
  return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` and ${numberToWords(rest)}` : ''}`;
}
