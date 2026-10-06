// Sound effects, generated with the Web Audio API (no audio files).
// Everything is soft and friendly: there is no buzzer for wrong answers.

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G4: 392, E4: 329.63, C4: 261.63 };

export function createSfx(win = globalThis) {
  let ac = null;
  let master = null;
  let enabled = true;

  function unlock() {
    const AC = win.AudioContext || win.webkitAudioContext;
    if (!AC) return;
    try {
      if (!ac) {
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.5;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch {
      ac = null; // no sound, and that's fine
    }
  }

  function tone(freq, { at = 0, dur = 0.18, type = 'sine', gain = 0.25, to = null } = {}) {
    const t0 = ac.currentTime + at;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    // Soft attack and release so nothing clicks or startles.
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const sounds = {
    tap() {
      tone(NOTE.A5, { dur: 0.07, type: 'triangle', gain: 0.12 });
    },
    correct() {
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => {
        tone(f, { at: i * 0.07, dur: 0.22, type: 'triangle', gain: 0.22 });
        tone(f * 2, { at: i * 0.07, dur: 0.12, gain: 0.04 });
      });
    },
    soft() {
      // A gentle, neutral "boop".
      tone(NOTE.G4, { dur: 0.16, gain: 0.16, to: NOTE.E4 });
      tone(NOTE.E4, { at: 0.12, dur: 0.2, gain: 0.12 });
    },
    star(n = 1) {
      const f = [NOTE.E5, NOTE.G5, NOTE.C6][Math.min(2, Math.max(0, n - 1))];
      tone(f, { dur: 0.45, type: 'triangle', gain: 0.22 });
      tone(f * 2, { dur: 0.3, gain: 0.06 });
    },
    fanfare() {
      const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
      seq.forEach((f, i) => tone(f, { at: i * 0.11, dur: 0.18, type: 'square', gain: 0.07 }));
      [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f) => tone(f, { at: 0.46, dur: 0.7, type: 'triangle', gain: 0.12 }));
    },
  };

  return {
    unlock,
    setEnabled(on) {
      enabled = Boolean(on);
    },
    get enabled() {
      return enabled;
    },
    play(name, arg) {
      if (!enabled || !ac || !sounds[name]) return;
      try {
        if (ac.state === 'suspended') ac.resume();
        sounds[name](arg);
      } catch {
        /* never let a sound effect break the game */
      }
    },
  };
}
