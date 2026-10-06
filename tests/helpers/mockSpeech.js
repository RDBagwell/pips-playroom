// A tiny stand-in for window.speechSynthesis so tests never need real audio.
export function createMockWindow({ voices = [], asyncVoices = false } = {}) {
  const spoken = [];
  const handlers = {};
  let loaded = !asyncVoices;
  const synth = {
    speaking: false,
    pending: false,
    cancelCalls: 0,
    getVoices: () => (loaded ? voices : []),
    speak(u) {
      spoken.push(u);
      synth.speaking = true;
    },
    cancel() {
      synth.cancelCalls += 1;
      synth.speaking = false;
      synth.pending = false;
    },
    addEventListener(type, fn) {
      (handlers[type] ||= []).push(fn);
    },
  };
  class SpeechSynthesisUtterance {
    constructor(text) {
      this.text = text;
    }
  }
  return {
    win: { speechSynthesis: synth, SpeechSynthesisUtterance },
    synth,
    spoken,
    loadVoices() {
      loaded = true;
      (handlers.voiceschanged || []).slice().forEach((fn) => fn());
    },
    finishAll() {
      spoken.forEach((u) => u.onend && u.onend());
      synth.speaking = false;
    },
  };
}

export const VOICES = [
  { name: 'Deutsch', lang: 'de-DE', voiceURI: 'de', localService: true, default: true },
  { name: 'Français', lang: 'fr-FR', voiceURI: 'fr', localService: true },
  { name: 'UK English', lang: 'en-GB', voiceURI: 'gb', localService: true },
  { name: 'US English', lang: 'en-US', voiceURI: 'us', localService: true },
  { name: 'Aussie', lang: 'en_AU', voiceURI: 'au', localService: false },
];
