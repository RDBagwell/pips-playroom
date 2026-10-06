// The page that replaces the old Reading Game URL (applied by hand to the
// Reading_Game repository: see docs/legacy-redirect/README.md).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const dir = `${process.cwd()}/docs/legacy-redirect`;
const html = readFileSync(`${dir}/index.html`, 'utf8');
const TARGET = 'https://rdbagwell.github.io/pips-playroom/';

describe('the old Reading Game URL', () => {
  it('redirects straight to Pip’s Playroom', () => {
    expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${TARGET}">`);
    expect(html).toContain(`<link rel="canonical" href="${TARGET}">`);
  });

  it('shows a visible link for browsers that don’t redirect', () => {
    expect(html).toMatch(/<h1>Reading Game has moved to Pip’s Playroom<\/h1>/);
    expect(html).toContain(`<a href="${TARGET}">Pip’s Playroom</a>`);
  });

  it('is not indexed, runs nothing and loads nothing', () => {
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toMatch(/<script|<img|<link rel="stylesheet"|\son[a-z]+=/i);
    expect(html).toMatch(/Content-Security-Policy" content="default-src 'none'/);
    const urls = (html.match(/https?:\/\/[^\s"'<]+/g) || []).filter((u) => u !== TARGET);
    expect(urls).toEqual([]);
  });

  it('handles deep links with an identical 404 page', () => {
    expect(readFileSync(`${dir}/404.html`, 'utf8')).toBe(html);
  });
});
