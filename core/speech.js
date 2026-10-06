// Speech synthesis wrapper.
//
// Fixes from v1:
//  - voices load asynchronously on many browsers, so we wait for `voiceschanged`
//    instead of grabbing `getVoices()[2]` straight away;
//  - we pick the best English voice rather than a hardcoded index;
//  - we cancel *before* speaking (v1 spoke, then cancelled its own utterance);
//  - every phrase gets a fresh SpeechSynthesisUtterance (reuse is flaky in Safari).

export const DEFAULT_RATE = 0.85;
export const MIN_RATE = 0.5;
export const MAX_RATE = 1.3;

/** True when this browser can speak. */
export function isSpeechSupported(win = globalThis) {
  return Boolean(win && win.speechSynthesis && typeof win.SpeechSynthesisUtterance === 'function');
}

function langOf(voice) {
  return String(voice.lang || '').replace('_', '-').toLowerCase();
}

/** English voices only, best first. Pure, so it is easy to test. */
export function rankEnglishVoices(voices) {
  const score = (v) => {
    const lang = langOf(v);
    let s = 0;
    if (lang === 'en-us') s += 40;
    else if (lang === 'en-gb') s += 30;
    else if (lang.startsWith('en')) s += 20;
    if (v.localService) s += 5; // local voices start faster and work offline
    if (v.default) s += 2;
    return s;
  };
  return voices
    .filter((v) => langOf(v).startsWith('en'))
    .map((v, i) => ({ v, i, s: score(v) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.v);
}

/**
 * Choose a voice: the grown-up's saved choice if it still exists,
 * otherwise the best English voice (en-US, then any en-*), otherwise the default.
 */
export function pickVoice(voices, preferredURI) {
  if (!voices || voices.length === 0) return null;
  if (preferredURI) {
    const saved = voices.find((v) => v.voiceURI === preferredURI);
    if (saved) return saved;
  }
  const english = rankEnglishVoices(voices);
  if (english.length) return english[0];
  return voices.find((v) => v.default) || voices[0];
}

export function clampRate(rate) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return DEFAULT_RATE;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, n));
}

/**
 * Create a speaker bound to a speechSynthesis implementation.
 * `win` is injectable so tests can pass a mock.
 */
export function createSpeech(win = globalThis, { voiceTimeoutMs = 2000 } = {}) {
  const synth = win.speechSynthesis;
  const Utterance = win.SpeechSynthesisUtterance;
  let voices = [];
  let voice = null;
  let preferredURI = null;
  let rate = DEFAULT_RATE;
  const listeners = new Set();

  function refreshVoices() {
    voices = synth.getVoices() || [];
    voice = pickVoice(voices, preferredURI);
    listeners.forEach((fn) => fn(voices));
  }

  // Resolves once voices are available, or after a timeout (some browsers never
  // fire `voiceschanged`, and speaking with the default voice is still fine).
  const ready = new Promise((resolve) => {
    refreshVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    const done = () => {
      clearTimeout(timer);
      refreshVoices();
      resolve(voices);
    };
    const timer = setTimeout(done, voiceTimeoutMs);
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', done, { once: true });
    } else {
      synth.onvoiceschanged = done;
    }
  });

  // Keep listening: voices can change later (e.g. a voice pack finishes downloading).
  if (typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', refreshVoices);
  }

  function makeUtterance(text) {
    const u = new Utterance(text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-US';
    }
    u.rate = rate;
    u.pitch = 1.05;
    return u;
  }

  function stop() {
    if (synth.speaking || synth.pending) synth.cancel();
  }

  /**
   * Speak one or more phrases in order. Cancels whatever was being said first.
   * Resolves when the last phrase ends (or a safety timeout passes, because
   * `onend` is not fired reliably on every browser).
   */
  function say(phrases) {
    const list = (Array.isArray(phrases) ? phrases : [phrases]).filter(Boolean);
    stop();
    if (list.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safety);
        resolve();
      };
      const chars = list.join(' ').length;
      const safety = setTimeout(finish, 1500 + (chars * 90) / rate);
      list.forEach((text, i) => {
        const u = makeUtterance(text);
        if (i === list.length - 1) {
          u.onend = finish;
          u.onerror = finish;
        }
        synth.speak(u);
      });
    });
  }

  return {
    ready,
    say,
    stop,
    get voices() {
      return voices;
    },
    get voice() {
      return voice;
    },
    get rate() {
      return rate;
    },
    setRate(r) {
      rate = clampRate(r);
    },
    setPreferredVoice(uri) {
      preferredURI = uri || null;
      voice = pickVoice(voices, preferredURI);
    },
    onVoicesChanged(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
