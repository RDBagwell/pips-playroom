// Entry point: register the games, load everything, then show the start screen.

import { createSpeech, isSpeechSupported } from './speech.js';
import { createStore, getBrowserStorage } from './storage.js';
import { createSfx } from './sfx.js';
import { ctx } from './context.js';
import { setRoot, go } from './router.js';
import { allGames, loadAllGames } from './registry.js';
import '../games/index.js';
import './screens/start.js';
import './screens/profiles.js';
import './screens/hub.js';
import './screens/scores.js';
import './screens/gate.js';
import './screens/settings.js';
import './screens/progress.js';
import './screens/stickers.js';
import './screens/about.js';

const NOTICES = {
  unavailable: "This browser isn't letting the game save, so scores will be forgotten when you close it. Everything else works!",
  corrupt: "We couldn't read the saved scores on this device, so we're starting fresh.",
  repaired: "Some saved scores couldn't be read, so a few readers may be missing.",
  imported: 'Welcome to Pip’s Playroom! Your readers and stars from the Reading Game are all here.',
  'imported-repaired': 'Welcome to Pip’s Playroom! We brought your readers over from the Reading Game, but a few couldn’t be read.',
};

/** Each game may bring its own stylesheet (same site only, so the CSP allows it). */
function addGameStyles() {
  for (const g of allGames()) {
    if (!g.stylesheet) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = g.stylesheet;
    document.head.append(link);
  }
}

async function init() {
  const root = document.getElementById('app');
  setRoot(root);
  addGameStyles();

  ctx.store = createStore(getBrowserStorage(window));
  const { record, status } = ctx.store.load();
  ctx.record = record;
  ctx.notice = NOTICES[status] || null;

  if (!isSpeechSupported(window)) {
    go('unsupported');
    return;
  }

  ctx.sfx = createSfx(window);
  ctx.sfx.setEnabled(record.settings.sfx);
  ctx.speech = createSpeech(window);
  ctx.speech.setRate(record.settings.rate);
  ctx.speech.setPreferredVoice(record.settings.voiceURI);

  const games = await loadAllGames(window.fetch.bind(window));
  if (games.every((g) => g.status !== 'ready')) {
    root.textContent = 'Sorry! The games could not be loaded. Please reload the page.';
    return;
  }
  go('start');
}

init();
