// Guards for the privacy and security rules: the players are children.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const jsFiles = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? jsFiles(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name)] : []);
const html = read('index.html');
const sources = jsFiles('js').map((f) => [f, read(f)]);

describe('page security', () => {
  it('declares a doctype and a strict Content Security Policy', () => {
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https?:/);
  });

  it('has no inline scripts or inline event handlers', () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/\son[a-z]+=/i);
  });

  it('never writes HTML strings into the page', () => {
    for (const [file, src] of sources) {
      expect(src, file).not.toMatch(/\.(innerHTML|outerHTML|insertAdjacentHTML)\s*=|insertAdjacentHTML\(|document\.write/);
      expect(src, file).not.toMatch(/\beval\(|new Function\(/);
    }
  });

  it('loads nothing from other sites', () => {
    const files = [['index.html', html], ['css/style.css', read('css/style.css')], ['manifest.webmanifest', read('manifest.webmanifest')], ...sources];
    for (const [file, src] of files) {
      const urls = src.match(/https?:\/\/[^\s'")]+/g) || [];
      // The only allowed absolute URL is the SVG namespace identifier.
      expect(urls.filter((u) => u !== 'http://www.w3.org/2000/svg'), file).toEqual([]);
    }
  });

  it('only fetches its own level data', () => {
    const fetches = sources.flatMap(([, src]) => src.match(/fetch\w*\(/g) || []);
    expect(fetches.length).toBeLessThanOrEqual(2);
    expect(read('js/main.js')).toMatch(/loadLevels\('\.\/data\/levels\.json'\)/);
  });

  it('uses relative paths so it works from a sub-path like /Reading_Game/', () => {
    const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    for (const r of refs) expect(r.startsWith('./'), r).toBe(true);
  });
});
