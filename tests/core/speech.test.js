import { describe, it, expect, vi } from 'vitest';
import {
  createSpeech,
  pickVoice,
  rankEnglishVoices,
  clampRate,
  isSpeechSupported,
  DEFAULT_RATE,
} from '../js/speech.js';
import { createMockWindow, VOICES } from './helpers/mockSpeech.js';

describe('voice selection', () => {
  it('prefers en-US over other English voices and never picks by index', () => {
    expect(pickVoice(VOICES).voiceURI).toBe('us');
  });

  it('falls back to any en-* voice when there is no en-US', () => {
    const noUS = VOICES.filter((v) => v.lang !== 'en-US');
    expect(pickVoice(noUS).voiceURI).toBe('gb');
    expect(pickVoice(noUS.filter((v) => v.lang !== 'en-GB')).voiceURI).toBe('au');
  });

  it('honours a saved grown-up choice when it still exists', () => {
    expect(pickVoice(VOICES, 'gb').voiceURI).toBe('gb');
    expect(pickVoice(VOICES, 'gone').voiceURI).toBe('us');
  });

  it('uses the default voice when no English voice exists', () => {
    expect(pickVoice(VOICES.slice(0, 2)).voiceURI).toBe('de');
    expect(pickVoice([])).toBeNull();
  });

  it('ranks only English voices', () => {
    expect(rankEnglishVoices(VOICES).map((v) => v.voiceURI)).toEqual(['us', 'gb', 'au']);
  });
});

describe('speech rate', () => {
  it('defaults slower than normal for young listeners', () => {
    expect(DEFAULT_RATE).toBeCloseTo(0.85);
    expect(clampRate('nope')).toBe(DEFAULT_RATE);
    expect(clampRate(5)).toBeLessThanOrEqual(1.3);
    expect(clampRate(0)).toBeGreaterThanOrEqual(0.5);
  });
});

describe('createSpeech', () => {
  it('detects support', () => {
    expect(isSpeechSupported({})).toBe(false);
    expect(isSpeechSupported(createMockWindow().win)).toBe(true);
  });

  it('waits for voiceschanged when voices load asynchronously', async () => {
    const mock = createMockWindow({ voices: VOICES, asyncVoices: true });
    const speech = createSpeech(mock.win);
    expect(speech.voice).toBeNull();
    mock.loadVoices();
    await speech.ready;
    expect(speech.voice.voiceURI).toBe('us');
  });

  it('still resolves if voiceschanged never fires', async () => {
    vi.useFakeTimers();
    const mock = createMockWindow({ voices: [], asyncVoices: true });
    const speech = createSpeech(mock.win, { voiceTimeoutMs: 100 });
    vi.advanceTimersByTime(150);
    await expect(speech.ready).resolves.toEqual([]);
    vi.useRealTimers();
  });

  it('cancels before speaking and uses a new utterance per phrase', async () => {
    const mock = createMockWindow({ voices: VOICES });
    const speech = createSpeech(mock.win);
    const order = [];
    const realCancel = mock.synth.cancel;
    mock.synth.cancel = () => {
      order.push('cancel');
      realCancel();
    };
    const realSpeak = mock.synth.speak;
    mock.synth.speak = (u) => {
      order.push(`speak:${u.text}`);
      realSpeak(u);
    };

    const first = speech.say('Hello');
    mock.finishAll();
    await first;
    mock.synth.speaking = true; // something is still talking
    const second = speech.say(['Find the word', 'dog']);
    mock.finishAll();
    await second;

    expect(order).toEqual(['speak:Hello', 'cancel', 'speak:Find the word', 'speak:dog']);
    const [a, b, c] = mock.spoken;
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(c.voice.voiceURI).toBe('us');
    expect(c.rate).toBeCloseTo(0.85);
  });

  it('applies rate and voice changes to later phrases', () => {
    const mock = createMockWindow({ voices: VOICES });
    const speech = createSpeech(mock.win);
    speech.setRate(1.1);
    speech.setPreferredVoice('gb');
    speech.say('cat');
    expect(mock.spoken[0].rate).toBeCloseTo(1.1);
    expect(mock.spoken[0].voice.voiceURI).toBe('gb');
  });

  it('resolves even if onend never fires', async () => {
    vi.useFakeTimers();
    const mock = createMockWindow({ voices: VOICES });
    const speech = createSpeech(mock.win);
    const p = speech.say('cat');
    vi.advanceTimersByTime(10000);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
