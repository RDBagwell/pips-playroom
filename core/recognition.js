// Voice answers, on this device only.
//
// The Web Speech API can recognise speech on a server (Chrome's default) or
// on the device. A child's voice must never leave the device, so this module
// only ever uses on-device recognition, as described on MDN:
//
//   SpeechRecognition.available({ langs, processLocally: true })
//     → 'available' | 'downloadable' | 'downloading' | 'unavailable'
//   SpeechRecognition.install({ langs, processLocally: true }) → true | false
//   recognition.processLocally = true   // must not use a remote service
//
// A browser without these features (older Chrome, Safari's webkit-prefixed
// recogniser, Firefox) reports 'unsupported', and voice answers stay hidden.
// There is no fallback to server recognition, ever.
//
// The microphone is only touched by start(), which games call only after a
// grown-up has switched voice answers on AND the child has tapped the mic.

export const LANG = 'en-US';

/** The recogniser class, but only when it supports on-device recognition. */
export function onDeviceRecognizer(win = globalThis) {
  const C = win && (win.SpeechRecognition || win.webkitSpeechRecognition);
  if (typeof C !== 'function') return null;
  if (typeof C.available !== 'function') return null;
  if (!C.prototype || !('processLocally' in C.prototype)) return null;
  return C;
}

/**
 * Can this device understand English speech by itself?
 * 'unsupported'  the browser can't do on-device recognition at all
 * 'unavailable'  it can, but not for English (or a policy blocks it)
 * 'downloadable' a language pack can be installed (see installOnDevice)
 * 'downloading'  the pack is on its way
 * 'available'    ready
 */
export async function onDeviceStatus(win = globalThis, lang = LANG) {
  const C = onDeviceRecognizer(win);
  if (!C) return 'unsupported';
  try {
    const result = await C.available({ langs: [lang], processLocally: true });
    return ['available', 'downloadable', 'downloading', 'unavailable'].includes(result) ? result : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Ask the browser to download the on-device language pack. Resolves true when installed. */
export async function installOnDevice(win = globalThis, lang = LANG) {
  const C = onDeviceRecognizer(win);
  if (!C || typeof C.install !== 'function') return false;
  try {
    return (await C.install({ langs: [lang], processLocally: true })) === true;
  } catch {
    return false;
  }
}

/** What a grown-up reads in settings for each status. */
export const STATUS_TEXT = {
  unsupported: 'This browser can’t understand speech on the device itself, so voice answers are switched off here. (Some browsers send speech to a server to understand it; the playroom never does that.) Number Quest works fully with taps.',
  unavailable: 'This browser can understand speech on the device, but not in English right now, so voice answers are switched off here. Number Quest works fully with taps.',
  downloadable: 'This device can understand English speech by itself once its English speech pack is installed. Installing it happens once, through your browser.',
  downloading: 'The English speech pack is downloading. Come back here in a little while to switch voice answers on.',
  available: 'This device can understand English speech by itself. Nothing your child says is sent anywhere.',
};

/**
 * A one-shot listener. start() listens for one answer and calls
 * onResult([transcripts, best first]); onState(state, detail) reports
 * 'listening', 'idle' and 'error'.
 */
export function createListener(win = globalThis, { lang = LANG, onResult = () => {}, onState = () => {} } = {}) {
  const C = onDeviceRecognizer(win);
  let rec = null;

  function start() {
    if (!C) {
      onState('error', 'unsupported');
      return false;
    }
    stop();
    const r = new C();
    r.processLocally = true;
    // If the browser didn't take the setting, it might use a server: refuse.
    if (r.processLocally !== true) {
      onState('error', 'not-on-device');
      return false;
    }
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.onresult = (e) => {
      const result = e.results && e.results[0];
      if (!result) return;
      const alternatives = Array.from({ length: result.length }, (_, i) => result[i] && result[i].transcript).filter(Boolean);
      onResult(alternatives);
    };
    r.onerror = (e) => onState('error', e && e.error);
    r.onend = () => {
      if (rec === r) rec = null;
      onState('idle');
    };
    rec = r;
    try {
      r.start();
    } catch {
      rec = null;
      onState('error', 'start-failed');
      return false;
    }
    onState('listening');
    return true;
  }

  function stop() {
    if (!rec) return;
    const r = rec;
    rec = null;
    try {
      r.abort();
    } catch {
      /* already stopped */
    }
  }

  return {
    start,
    stop,
    get listening() {
      return rec !== null;
    },
  };
}
