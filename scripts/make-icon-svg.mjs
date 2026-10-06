// Builds icons/icon.svg from the mascot drawing in js/mascot.js.
// Run: node scripts/make-icon-svg.mjs   (uses jsdom, a dev dependency)
// The PNG icons were then rasterised from icon.svg with a headless browser
// (see README → "Icons").
import { JSDOM } from 'jsdom';
import { writeFileSync } from 'node:fs';

const { window } = new JSDOM('<!DOCTYPE html>');
globalThis.document = window.document;
globalThis.Node = window.Node;
const { owlSvg } = await import('../js/mascot.js');

const owl = owlSvg();
owl.removeAttribute('class');
owl.removeAttribute('role');
owl.removeAttribute('aria-label');
owl.removeAttribute('focusable');
// The owl sits inside the central "safe zone" so the icon also works when an
// operating system crops it to a circle (maskable icons).
owl.setAttribute('x', '106');
owl.setAttribute('y', '96');
owl.setAttribute('width', '300');
owl.setAttribute('height', '330');

const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFE8FF"/>
      <stop offset="1" stop-color="#FFF5DA"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/>
  <ellipse cx="120" cy="560" rx="300" ry="150" fill="#86C55A"/>
  <ellipse cx="420" cy="570" rx="280" ry="150" fill="#A3D977"/>
  ${owl.outerHTML}
</svg>
`;
writeFileSync(new URL('../icons/icon.svg', import.meta.url), doc);
console.log('wrote icons/icon.svg');
