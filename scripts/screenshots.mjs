// Takes the README's screenshots with a real browser (never mocked up):
//   npm run screenshots
// It serves this folder itself, plays each game a little on phone and tablet
// sizes, and saves PNGs to docs/screenshots/. Needs Playwright's Chromium
// (`npx playwright install chromium`, or PLAYWRIGHT_BROWSERS_PATH set).
// Fails if a page logs an error, requests anything from another site,
// scrolls sideways, a speech bubble's tail doesn't point at Pip, or the
// grown-ups' panels leave gaps (see lib/layout-checks.mjs).

import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBubbleTails, checkPanelGaps } from './lib/layout-checks.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'docs', 'screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const DEVICES = {
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

/** A reader with some progress in every game, so the hub, sticker book and progress view have something to show. */
function seed() {
  const r = JSON.parse(localStorage.getItem('pips-playroom'));
  const lv = (n, s) => Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), { stars: s[i % s.length], best: 120 + i * 10, plays: 1 + (i % 2) }]));
  const p = r.profiles[0];
  p.games = {
    reading: { unlocked: 6, levels: lv(5, [3, 3, 2, 3, 2]), totalScore: 1240, tricky: { ship: 3, chip: 2, that: 1, duck: 1 }, stats: {} },
    'number-quest': { unlocked: 4, levels: lv(3, [3, 3, 2]), totalScore: 380, tricky: { '24|27': 2, '13|17': 1 }, stats: { rounds: 11, guesses: 41, best: 46, splitChances: 30, goodSplits: 17, mixups: 3, hints: 2, threeStars: 8 } },
    'math-garden': { unlocked: 5, levels: lv(4, [3, 2, 3, 2]), totalScore: 610, tricky: { '3+4=7': 2, '2+6=8': 1, 'count 7': 1 }, stats: { questions: 38, firstTry: 30, missed: 6 } },
    typing: { unlocked: 4, levels: lv(3, [3, 2, 3]), totalScore: 260, tricky: { b: 3, y: 2, space: 1 }, stats: { keys: 212, wrongKeys: 19 } },
  };
  p.stickers = { seen: 0, scenes: { beach: [
    { id: 'sun', x: 84, y: 14 }, { id: 'whale', x: 62, y: 56 }, { id: 'fish', x: 30, y: 60 },
    { id: 'crab', x: 22, y: 86 }, { id: 'octopus', x: 80, y: 84 }, { id: 'ladybug', x: 52, y: 90 },
  ] } };
  for (const g of Object.keys(r.settings.games)) r.settings.games[g].unlockAll = true;
  localStorage.setItem('pips-playroom', JSON.stringify(r));
}

const problems = [];
const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });

for (const [name, device] of Object.entries(DEVICES)) {
  const page = await browser.newPage(device);
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${name}: ${m.text()}`); });
  page.on('request', (r) => { if (!r.url().startsWith(base)) problems.push(`${name}: requested ${r.url()}`); });
  const shot = async (what) => {
    await page.waitForTimeout(700);
    const wide = await page.evaluate((w) => Math.max(document.documentElement.scrollWidth, innerWidth) - w, device.viewport.width);
    if (wide > 1) problems.push(`${name} ${what}: ${wide}px too wide`);
    await page.screenshot({ path: join(outDir, `${name}-${what}.png`) });
  };
  const layout = async (what, check) => {
    for (const p of await page.evaluate(`(${check.toString()})()`)) problems.push(`${name} ${what}: ${p}`);
  };
  const tap = (locator) => locator.first().click({ force: true }); // a few buttons breathe and bounce on purpose
  const home = async () => {
    await page.goto(base);
    await tap(page.getByRole('button', { name: /Tap to play/ }));
    await tap(page.locator('.profile-tile'));
    const later = page.getByRole('button', { name: 'Later' });
    if (await later.count()) await tap(later);
  };
  const open = async (game, level) => {
    await home();
    await tap(page.locator(`.game-card[data-game="${game}"]`));
    await tap(page.locator('.stone').nth(level - 1));
    await page.waitForTimeout(900);
  };

  await page.goto(base);
  await tap(page.getByRole('button', { name: /Tap to play/ }));
  await page.locator('#reader-name').fill('Ava');
  await tap(page.getByRole('button', { name: /Let's go/ }));
  await page.evaluate(seed);
  await home();
  await page.evaluate(() => scrollTo(0, 0));
  await layout('hub', checkBubbleTails);
  await shot('hub');

  // Reading Game: one wrong tap, so the gentle correction shows.
  await open('reading', 5);
  await tap(page.locator('.card').nth(1));
  await shot('reading');

  // Number Quest: two guesses in, with clouds over what's ruled out.
  await open('number-quest', 3);
  await tap(page.locator('.num-tile[data-n="10"]'));
  await page.waitForTimeout(300);
  const range = await page.locator('.range-label').textContent();
  const m = range.match(/between (\d+) and (\d+)/);
  if (m) await tap(page.locator(`.num-tile[data-n="${Math.floor((Number(m[1]) + Number(m[2])) / 2)}"]`));
  await layout('number quest', checkBubbleTails);
  await shot('number-quest');

  // Math Garden: a wrong answer on an adding level, so Pip counts along.
  await open('math-garden', 4);
  const kind = await page.locator('.math-answers').getAttribute('data-kind');
  await tap(page.locator('.math-choice').nth(kind === 'pick' ? 0 : 1));
  await page.waitForTimeout(1800);
  await shot('math-garden');

  // Type with Pip: a Reading Game word, two letters in. A key press tells it there's a keyboard.
  await open('typing', 6);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(900);
  const word = await page.evaluate(() => [...document.querySelectorAll('.type-target .ch')].map((c) => c.textContent).join(''));
  for (const c of word.slice(0, 2)) await page.keyboard.press(c);
  await shot('typing');

  // The sticker book's beach page.
  await home();
  await tap(page.locator('.sticker-banner'));
  await shot('stickers');

  // The grown-ups' progress view (past the 3-second hold).
  await home();
  await tap(page.getByRole('button', { name: 'Grown-ups' }));
  const hold = await page.locator('.hold-button').boundingBox();
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  await layout('grown-ups', checkPanelGaps);
  await tap(page.getByRole('button', { name: 'Progress' }));
  await layout('progress', checkPanelGaps);
  await page.locator('.progress-game[aria-label="Math Garden"]').evaluate((n) => n.scrollIntoView({ block: 'start' }));
  await shot('progress');
  await page.close();
}

// Type with Pip on a laptop: a real keyboard, the finger colours and the next key.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(base);
  await page.getByRole('button', { name: /Tap to play/ }).click({ force: true });
  await page.locator('#reader-name').fill('Ava');
  await page.getByRole('button', { name: /Let's go/ }).click({ force: true });
  await page.evaluate(seed);
  await page.goto(base);
  await page.getByRole('button', { name: /Tap to play/ }).click({ force: true });
  await page.locator('.profile-tile').first().click({ force: true });
  await page.getByRole('button', { name: 'Later' }).click({ force: true });
  await page.locator('.game-card[data-game="typing"]').click({ force: true });
  await page.locator('.stone').nth(10).click({ force: true });
  await page.waitForTimeout(900);
  const sentence = await page.evaluate(() => [...document.querySelectorAll('.type-target .ch')].map((c) => c.textContent.replace(' ', ' ')).join(''));
  for (const c of sentence.slice(0, 6)) await page.keyboard.press(c === ' ' ? 'Space' : c);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, 'laptop-typing.png') });
  const check = async (what, fn) => {
    for (const p of await page.evaluate(`(${fn.toString()})()`)) problems.push(`laptop ${what}: ${p}`);
  };
  await page.getByRole('button', { name: 'Back to the map' }).click({ force: true });
  await page.getByRole('button', { name: 'Back to the playroom' }).click({ force: true });
  await page.locator('.game-card[data-game="number-quest"]').click({ force: true });
  await page.locator('.stone').first().click({ force: true });
  await page.waitForTimeout(900);
  await check('number quest', checkBubbleTails);
  await page.getByRole('button', { name: 'Back to the map' }).click({ force: true });
  await page.getByRole('button', { name: 'Grown-ups' }).click({ force: true });
  const hold = await page.locator('.hold-button').boundingBox();
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  await page.waitForTimeout(400);
  await check('grown-ups', checkPanelGaps);
  await page.getByRole('button', { name: 'Progress' }).first().click({ force: true });
  await check('progress', checkPanelGaps);
  await page.getByRole('button', { name: 'Back to settings' }).click({ force: true });
  await page.getByRole('button', { name: 'Read about the games' }).click({ force: true });
  await check('about', checkPanelGaps);
  await page.close();
}

await browser.close();
server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Saved screenshots to ${outDir}`);
