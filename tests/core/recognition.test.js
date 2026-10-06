// @vitest-environment jsdom
// Voice answers may only ever use on-device recognition.
import { describe, it, expect, vi } from 'vitest';
import { onDeviceRecognizer, onDeviceStatus, installOnDevice, createListener, STATUS_TEXT } from '../../core/recognition.js';
import { voiceAnswersBlock } from '../../games/number-quest/game.js';
import { createMockRecognition } from '../helpers/mockRecognition.js';

const ON_DEVICE = { langs: ['en-US'], processLocally: true };

describe('on-device availability', () => {
  it('reports each state the browser gives', async () => {
    for (const status of ['available', 'downloadable', 'downloading', 'unavailable']) {
      const mock = createMockRecognition({ status });
      expect(await onDeviceStatus({ SpeechRecognition: mock.SpeechRecognition })).toBe(status);
      expect(mock.calls.available).toEqual([ON_DEVICE]);
    }
  });

  it('is unsupported without the on-device API (no fallback to server recognition)', async () => {
    expect(await onDeviceStatus({})).toBe('unsupported');
    // Safari's / older Chrome's recogniser: no available(), no processLocally.
    class OldRecognition {}
    expect(await onDeviceStatus({ webkitSpeechRecognition: OldRecognition })).toBe('unsupported');
    // available() but no processLocally property: can't be told to stay local.
    class Half {}
    Half.available = async () => 'available';
    expect(await onDeviceStatus({ SpeechRecognition: Half })).toBe('unsupported');
    expect(onDeviceRecognizer({ SpeechRecognition: Half })).toBeNull();
  });

  it('treats errors and odd answers as unavailable', async () => {
    const blocked = createMockRecognition({ throwsOnAvailable: true });
    expect(await onDeviceStatus({ SpeechRecognition: blocked.SpeechRecognition })).toBe('unavailable');
    const odd = createMockRecognition({ status: 'maybe' });
    expect(await onDeviceStatus({ SpeechRecognition: odd.SpeechRecognition })).toBe('unavailable');
  });

  it('installs the language pack for on-device use only', async () => {
    const mock = createMockRecognition({ status: 'downloadable' });
    const win = { SpeechRecognition: mock.SpeechRecognition };
    expect(await installOnDevice(win)).toBe(true);
    expect(mock.calls.install).toEqual([ON_DEVICE]);
    expect(await onDeviceStatus(win)).toBe('available');
    const failing = createMockRecognition({ status: 'downloadable', install: false });
    expect(await installOnDevice({ SpeechRecognition: failing.SpeechRecognition })).toBe(false);
    expect(await installOnDevice({})).toBe(false);
  });

  it('explains every state to grown-ups', () => {
    for (const s of ['unsupported', 'unavailable', 'downloadable', 'downloading', 'available']) expect(STATUS_TEXT[s]).toBeTruthy();
    expect(STATUS_TEXT.unsupported).toMatch(/never/);
  });
});

describe('listening', () => {
  it('sets processLocally before starting, and passes on what was heard', () => {
    const mock = createMockRecognition();
    const heard = [];
    const states = [];
    const listener = createListener({ SpeechRecognition: mock.SpeechRecognition }, {
      onResult: (alts) => heard.push(alts), onState: (s) => states.push(s),
    });
    expect(mock.calls.instances).toHaveLength(0); // nothing (no microphone) until start()
    expect(listener.start()).toBe(true);
    const rec = mock.calls.instances[0];
    expect(rec.processLocally).toBe(true);
    expect(rec.started).toBe(true);
    expect(rec.lang).toBe('en-US');
    expect(listener.listening).toBe(true);
    rec.hear('seventy two', 'seventy too');
    expect(heard).toEqual([['seventy two', 'seventy too']]);
    expect(states).toEqual(['listening', 'idle']);
    expect(listener.listening).toBe(false);
  });

  it('refuses to start if the browser ignores processLocally', () => {
    const mock = createMockRecognition({ localSticks: false });
    const states = [];
    const listener = createListener({ SpeechRecognition: mock.SpeechRecognition }, { onState: (s, d) => states.push([s, d]) });
    expect(listener.start()).toBe(false);
    expect(mock.calls.instances[0].started).toBe(false);
    expect(states).toEqual([['error', 'not-on-device']]);
  });

  it('never creates a recogniser when on-device recognition is unsupported', () => {
    const Server = vi.fn();
    const states = [];
    const listener = createListener({ webkitSpeechRecognition: Server }, { onState: (s, d) => states.push([s, d]) });
    expect(listener.start()).toBe(false);
    expect(Server).not.toHaveBeenCalled();
    expect(states).toEqual([['error', 'unsupported']]);
  });

  it('stops cleanly', () => {
    const mock = createMockRecognition();
    const listener = createListener({ SpeechRecognition: mock.SpeechRecognition });
    listener.start();
    listener.stop();
    expect(mock.calls.instances[0].aborted).toBe(true);
    expect(listener.listening).toBe(false);
  });
});

describe("grown-ups' voice answers setting", () => {
  async function block(status, extra = {}) {
    const mock = createMockRecognition({ status, ...extra });
    const s = { voiceInput: false };
    const commit = vi.fn();
    const b = voiceAnswersBlock(s, commit, { SpeechRecognition: mock.SpeechRecognition });
    expect(await b.ready).toBe('unchecked');
    expect(mock.calls.available).toHaveLength(0); // not asked until a grown-up taps "Check"
    expect(b.node.querySelector('input')).toBeNull();
    [...b.node.querySelectorAll('button')].find((x) => x.textContent === 'Check this device').click();
    await b.ready;
    return { node: b.node, s, commit, mock };
  }

  it('hides the option entirely, and explains why, when unsupported or unavailable', async () => {
    const none = voiceAnswersBlock({ voiceInput: false }, () => {}, {});
    expect(await none.ready).toBe('unsupported');
    expect(none.node.querySelector('input')).toBeNull();
    expect(none.node.textContent).toMatch(/can’t understand speech on the device/);
    const unavailable = await block('unavailable');
    expect(unavailable.node.querySelector('input')).toBeNull();
    expect(unavailable.node.textContent).toMatch(/not in English/);
  });

  it('offers to install the language pack when it is downloadable', async () => {
    const b = await block('downloadable');
    expect(b.node.querySelector('input')).toBeNull();
    const install = [...b.node.querySelectorAll('button')].find((x) => /Install/.test(x.textContent));
    install.click();
    await vi.waitFor(() => expect(b.node.querySelector('#quest-voice')).not.toBeNull());
    expect(b.mock.calls.install).toEqual([ON_DEVICE]);
  });

  it('says to check back while downloading', async () => {
    const b = await block('downloading');
    expect(b.node.querySelector('input')).toBeNull();
    expect(b.node.textContent).toMatch(/downloading/);
  });

  it('shows an off-by-default switch, with an explanation, when available', async () => {
    const b = await block('available');
    const input = b.node.querySelector('#quest-voice');
    expect(input.checked).toBe(false);
    expect(b.node.textContent).toMatch(/only used after your child taps it/);
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(b.s.voiceInput).toBe(true);
    expect(b.commit).toHaveBeenCalled();
  });

  it('checks straight away once voice answers are on, and hides the switch if that stops working', async () => {
    const mock = createMockRecognition({ status: 'unavailable' });
    const b = voiceAnswersBlock({ voiceInput: true }, () => {}, { SpeechRecognition: mock.SpeechRecognition });
    expect(await b.ready).toBe('unavailable');
    expect(b.node.querySelector('input')).toBeNull();
  });
});
