// Every game's stylesheet is loaded on every page, so a rule one sheet hangs
// on a class must not also catch elements of another game. (A ".typed" rule
// in Number Quest once restyled Type with Pip's ".ch.typed" letters, and the
// shared ".empty" collapsed Math Garden's ".frame-cell.empty" cells.)
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sheet = (p) => readFileSync(join(root, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const selectorsOf = (css) => css.replace(/\{[^{}]*\}/g, '{}').replace(/@[^{]+\{/g, '');
/** Classes a rule is anchored on (".typed", ".fingers .kb-key"), which match anywhere. */
const anchored = (css) => new Set([...selectorsOf(css).matchAll(/(?:^|[\s>+~,}])\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
/** Every class a sheet mentions, including states like ".ch.typed". */
const mentioned = (css) => new Set([...selectorsOf(css).matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));

const sheets = [
  ['shared', sheet('css/style.css') + sheet('css/playroom.css')],
  ...readdirSync(join(root, 'games'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, 'games', d.name, 'style.css')))
    .map((d) => [d.name, sheet(`games/${d.name}/style.css`)]),
];

// Shared building blocks a game builds on on purpose.
const SHARED_ON_PURPOSE = new Set(['helper', 'mascot', 'mascot-slot', 'hear-button', 'big-button', 'secondary', 'dot', 'screen', 'panel', 'hint', 'on', 'tried', 'wrong', 'correct', 'answered']);

describe('stylesheets', () => {
  it('no sheet anchors a rule on a class another sheet uses', () => {
    for (const [a, cssA] of sheets) {
      for (const [b, cssB] of sheets) {
        if (a === b) continue;
        const clash = [...anchored(cssA)].filter((c) => mentioned(cssB).has(c) && !SHARED_ON_PURPOSE.has(c));
        expect(clash, `${a} rules catch ${b} elements`).toEqual([]);
      }
    }
  });

  it('would have caught the old clashes', () => {
    const clash = (css1, css2) => [...anchored(css1)].filter((c) => mentioned(css2).has(c));
    expect(clash('.typed { font-size: 1.5rem; }', '.ch.typed { color: green; }')).toEqual(['typed']);
    expect(clash('.empty { margin: 0 auto; }', '.frame-cell.empty { border: 3px dashed; }')).toEqual(['empty']);
  });
});
