import { describe, it, expect, vi } from 'vitest';
import {
  createSpeech,
  pickVoice,
  rankEnglishVoices,
  usesInternet,
  hasOnDeviceEnglish,
  clampRate,
  isSpeechSupported,
  DEFAULT_RATE,
} from '../../core/speech.js';
import { createMockWindow, VOICES } from '../helpers/mockSpeech.js';

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

describe('privacy: on-device voices first', () => {
  // Shaped like Chrome on a laptop: its "Google" voices are online
  // (localService: false), the operating system's voices are on-device.
  const CHROME = [
    { name: 'Google US English', lang: 'en-US', voiceURI: 'Google US English', localService: false },
    { name: 'Google UK English Female', lang: 'en-GB', voiceURI: 'Google UK English Female', localService: false },
    { name: 'Microsoft Zira', lang: 'en-US', voiceURI: 'zira', localService: true, default: true },
    { name: 'Microsoft Hazel', lang: 'en-GB', voiceURI: 'hazel', localService: true },
    { name: 'Google Deutsch', lang: 'de-DE', voiceURI: 'Google Deutsch', localService: false },
  ];

  it('prefers an on-device voice over an online voice, even an online en-US one', () => {
    expect(pickVoice(CHROME).voiceURI).toBe('zira');
    const noLocalUS = CHROME.filter((v) => v.voiceURI !== 'zira');
    expect(pickVoice(noLocalUS).voiceURI).toBe('hazel');
  });

  it('ranks every on-device English voice above every online one', () => {
    expect(rankEnglishVoices(CHROME).map((v) => v.voiceURI)).toEqual(['zira', 'hazel', 'Google US English', 'Google UK English Female']);
  });

  it('uses an online voice only when there is no on-device English voice', () => {
    const onlineOnly = CHROME.filter((v) => !v.localService);
    expect(hasOnDeviceEnglish(onlineOnly)).toBe(false);
    expect(hasOnDeviceEnglish(CHROME)).toBe(true);
    const v = pickVoice(onlineOnly);
    expect(v.voiceURI).toBe('Google US English');
    expect(usesInternet(v)).toBe(true);
  });

  it('honours a grown-up who chooses an online voice on purpose', () => {
    expect(pickVoice(CHROME, 'Google UK English Female').voiceURI).toBe('Google UK English Female');
  });

  it('prefers an on-device default when there is no English voice at all', () => {
    const german = [
      { name: 'Google Deutsch', lang: 'de-DE', voiceURI: 'g', localService: false, default: true },
      { name: 'Anna', lang: 'de-DE', voiceURI: 'anna', localService: true },
    ];
    expect(pickVoice(german).voiceURI).toBe('anna');
  });

  it('treats voices that do not say as on-device (Safari, Firefox)', () => {
    expect(usesInternet({ name: 'Samantha', lang: 'en-US' })).toBe(false);
    expect(usesInternet(null)).toBe(false);
  });

  it('tells the settings screen when the voice in use goes online', () => {
    const online = createMockWindow({ voices: CHROME.filter((v) => !v.localService) });
    expect(createSpeech(online.win).usesInternet).toBe(true);
    const local = createMockWindow({ voices: CHROME });
    const speech = createSpeech(local.win);
    expect(speech.usesInternet).toBe(false);
    speech.setPreferredVoice('Google US English');
    expect(speech.usesInternet).toBe(true);
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
