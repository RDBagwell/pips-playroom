// A stand-in for the Web Speech API's SpeechRecognition, so tests can report
// every on-device availability state without a microphone.
export function createMockRecognition({ status = 'available', install = true, localSticks = true, throwsOnAvailable = false } = {}) {
  const calls = { available: [], install: [], instances: [] };
  class SpeechRecognition {
    constructor() {
      this._local = false;
      this.started = false;
      this.aborted = false;
      calls.instances.push(this);
    }

    get processLocally() {
      return this._local;
    }

    set processLocally(v) {
      if (localSticks) this._local = Boolean(v);
    }

    start() {
      this.started = true;
    }

    abort() {
      this.aborted = true;
      if (this.onend) this.onend();
    }

    /** Test helper: pretend the child said something. */
    hear(...transcripts) {
      const result = transcripts.map((transcript) => ({ transcript, confidence: 0.9 }));
      this.onresult({ results: [result] });
      if (this.onend) this.onend();
    }

    static async available(options) {
      calls.available.push(options);
      if (throwsOnAvailable) throw new DOMException('blocked', 'NotAllowedError');
      return status;
    }

    static async install(options) {
      calls.install.push(options);
      if (install) status = 'available';
      return install;
    }
  }
  return { SpeechRecognition, calls, setStatus: (s) => { status = s; } };
}
