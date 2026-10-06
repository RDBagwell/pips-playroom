// Entry point: load everything, then show the start screen.

import { createSpeech, isSpeechSupported } from './speech.js';
import { loadLevels } from './levels.js';
import { createStore, getBrowserStorage } from './storage.js';
import { createSfx } from './sfx.js';
import { ctx } from './context.js';
import { setRoot, go } from './router.js';
import './screens/start.js';
import './screens/profiles.js';
import './screens/map.js';
import './screens/play.js';
import './screens/complete.js';
import './screens/scores.js';
import './screens/gate.js';
import './screens/settings.js';

const NOTICES = {
  unavailable: "This browser isn't letting the game save, so scores will be forgotten when you close it. Everything else works!",
  corrupt: "We couldn't read the saved scores on this device, so we're starting fresh.",
  repaired: "Some saved scores couldn't be read, so a few readers may be missing.",
};

async function init() {
  const root = document.getElementById('app');
  setRoot(root);

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

  try {
    ctx.levels = await loadLevels('./data/levels.json');
  } catch (err) {
    console.error(err);
    root.textContent = 'Sorry! The word lists could not be loaded. Please reload the page.';
    return;
  }
  go('start');
}

init();
