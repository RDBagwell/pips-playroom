// Grown-ups' corner: voice, speed, sounds, which games are available, each
// game's own settings, readers (with a progress view), and privacy.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, settings, gameSettings, save } from '../context.js';
import { screen, topbar, avatarBadge } from '../ui.js';
import { section, toggle } from '../settings-ui.js';
import { allGames } from '../registry.js';
import { rankEnglishVoices, usesInternet, hasOnDeviceEnglish, MIN_RATE, MAX_RATE, DEFAULT_RATE } from '../speech.js';
import { renameProfile, deleteProfile, resetProfile, NAME_MAX, validateName } from '../profiles.js';
import { allStars } from '../progress.js';
import { confirmDialog, promptDialog } from '../dialog.js';
import { defaultBack } from './gate.js';

const SAMPLE = 'Hi! I’m Pip. Let’s play!';

/** The note shown when the voice in use sends words to an online service. */
export function onlineVoiceNote(voices, voice) {
  if (!usesInternet(voice)) return null;
  if (!hasOnDeviceEnglish(voices)) {
    return 'This voice uses the internet. This device has no English voice of its own, so the words Pip says are sent to an online speech service to be spoken. You can add an on-device voice in your device’s speech or accessibility settings.';
  }
  return 'This voice uses the internet: the words Pip says are sent to an online speech service. Choose a voice under “On this device” to keep everything on this device.';
}

register('settings', ({ back: backTo = defaultBack() } = {}) => {
  const s = settings();
  const { speech } = ctx;
  const cleanups = [];
  const commit = () => save();
  const back = () => go(backTo.name, backTo.params);
  const here = { name: 'settings', params: { back: backTo } };

  // ----- voice -----
  const voiceSelect = el('select', { id: 'voice', class: 'select', 'aria-describedby': 'voice-note' });
  const voiceNote = el('p', { id: 'voice-note', class: 'notice notice-warn voice-note', role: 'status' });
  function showVoiceNote() {
    const text = onlineVoiceNote(speech.voices, speech.voice);
    voiceNote.textContent = text || '';
    voiceNote.hidden = !text;
  }
  function fillVoices() {
    const english = rankEnglishVoices(speech.voices);
    const local = english.filter((v) => !usesInternet(v));
    const online = english.filter((v) => usesInternet(v));
    const others = speech.voices.filter((v) => !english.includes(v));
    const current = speech.voice ? speech.voice.voiceURI : '';
    const option = (v) => {
      const o = el('option', { value: v.voiceURI, text: `${v.name} (${v.lang})${usesInternet(v) ? ' · uses the internet' : ''}` });
      o.selected = s.voiceURI ? v.voiceURI === current : false;
      return o;
    };
    const auto = el('option', { value: '', text: 'Automatic (best voice on this device)' });
    auto.selected = !s.voiceURI;
    const groups = [auto];
    if (local.length) groups.push(el('optgroup', { label: 'English · on this device' }, ...local.map(option)));
    if (online.length) groups.push(el('optgroup', { label: 'English · uses the internet' }, ...online.map(option)));
    if (others.length) groups.push(el('optgroup', { label: 'Other languages' }, ...others.map(option)));
    voiceSelect.replaceChildren(...groups);
    showVoiceNote();
  }
  fillVoices();
  cleanups.push(speech.onVoicesChanged(fillVoices));
  voiceSelect.addEventListener('change', () => {
    // Picking an online voice here is the grown-up's explicit choice; it is remembered.
    s.voiceURI = voiceSelect.value || null;
    speech.setPreferredVoice(s.voiceURI);
    commit();
    showVoiceNote();
    speech.say(SAMPLE);
  });

  // ----- speed -----
  const rateOut = el('output', { for: 'rate', class: 'rate-value' });
  const showRate = () => {
    const label = s.rate < 0.8 ? 'slow' : s.rate < 0.95 ? 'a little slow' : s.rate <= 1.05 ? 'normal' : 'fast';
    rateOut.textContent = `${s.rate.toFixed(2)}× · ${label}`;
  };
  const rate = el('input', { type: 'range', id: 'rate', min: MIN_RATE, max: MAX_RATE, step: 0.05, value: s.rate, class: 'range' });
  rate.addEventListener('input', () => {
    s.rate = Number(rate.value);
    speech.setRate(s.rate);
    showRate();
  });
  rate.addEventListener('change', () => {
    commit();
    speech.say(SAMPLE);
  });
  showRate();

  // ----- which games are available -----
  const gameToggles = allGames().map((g) => toggle({
    id: `show-${g.id}`,
    label: g.title,
    hint: g.tagline,
    checked: !s.hiddenGames.includes(g.id),
    onChange: (on) => {
      s.hiddenGames = on ? s.hiddenGames.filter((id) => id !== g.id) : [...new Set([...s.hiddenGames, g.id])];
      commit();
    },
  }));

  // ----- readers -----
  const readerList = el('ul', { class: 'reader-list' });
  function renderReaders() {
    const rows = ctx.record.profiles.map((p) => el('li', { class: 'reader-row' },
      avatarBadge(p),
      el('span', { class: 'reader-name' }, el('strong', { text: p.name }), el('small', { text: `★ ${allStars(p)} in all games` })),
      el('span', { class: 'reader-actions' },
        el('button', { type: 'button', class: 'small-button', on: { click: () => go('progress', { profileId: p.id, back: here }) } }, 'Progress'),
        el('button', { type: 'button', class: 'small-button', on: { click: () => rename(p) } }, 'Rename'),
        el('button', { type: 'button', class: 'small-button', on: { click: () => reset(p) } }, 'Reset scores'),
        el('button', { type: 'button', class: 'small-button danger', on: { click: () => remove(p) } }, 'Delete'))));
    readerList.replaceChildren(...(rows.length ? rows : [el('li', { class: 'hint', text: 'No readers yet.' })]));
  }
  async function rename(p) {
    const name = await promptDialog({
      title: `Rename ${p.name}`,
      confirmLabel: 'Save',
      input: { value: p.name, label: 'New name', maxlength: NAME_MAX, validate: validateName },
    });
    if (name === null) return;
    const result = renameProfile(ctx.record, p.id, name);
    if (!result.ok) {
      await confirmDialog({ title: 'Could not rename', message: result.error, confirmLabel: 'OK' });
      return;
    }
    commit();
    renderReaders();
  }
  async function reset(p) {
    const ok = await confirmDialog({
      title: `Reset ${p.name}'s scores?`,
      message: 'Stars, best scores and unlocked levels in every game go back to the start. This can’t be undone. (To reset just one game, use Progress.)',
      confirmLabel: 'Reset scores', danger: true,
    });
    if (!ok) return;
    resetProfile(ctx.record, p.id);
    commit();
    renderReaders();
  }
  async function remove(p) {
    const ok = await confirmDialog({
      title: `Delete ${p.name}?`,
      message: 'This removes the reader and all their scores from this device. This can’t be undone.',
      confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;
    deleteProfile(ctx.record, p.id);
    commit();
    renderReaders();
  }
  renderReaders();

  // ----- each game's own section -----
  const gameSections = allGames()
    .filter((g) => typeof g.settingsSection === 'function')
    .map((g) => g.settingsSection({
      settings: gameSettings(g.id),
      levels: g.levels,
      commit,
      onCleanup: (fn) => cleanups.push(fn),
    }));

  const imported = (ctx.record.imports || []).find((i) => i.status === 'imported');

  const node = screen('settings',
    topbar({ title: 'Grown-ups’ corner', back, backLabel: 'Back to the game' }),
    el('div', { class: 'settings-grid' },
      el('section', { class: 'panel settings-section about-link' },
        el('h2', { text: 'About these games' }),
        el('p', { class: 'hint left', text: 'What each game practises, and how the playroom keeps children safe and their data private, in plain language.' }),
        el('button', { type: 'button', class: 'small-button', on: { click: () => go('about', { back: here }) } }, 'Read about the games')),
      section('Voice',
        el('label', { for: 'voice', class: 'setting-label', text: 'Which voice Pip uses' }),
        voiceSelect,
        voiceNote,
        el('p', { class: 'hint left', text: 'Voices come from this device. Voices on this device are used first, so what Pip says stays on the device. If the list is short, you can add voices in your device’s accessibility or speech settings.' }),
        el('label', { for: 'rate', class: 'setting-label' }, 'Speaking speed ', rateOut),
        el('div', { class: 'range-row' }, el('span', { 'aria-hidden': 'true', text: '🐢' }), rate, el('span', { 'aria-hidden': 'true', text: '🐇' })),
        el('button', { type: 'button', class: 'small-button', on: { click: () => { s.rate = DEFAULT_RATE; rate.value = String(DEFAULT_RATE); speech.setRate(DEFAULT_RATE); showRate(); commit(); } } }, 'Reset speed'),
        el('button', { type: 'button', class: 'small-button', on: { click: () => speech.say(SAMPLE) } }, '🔊 Test voice'),
      ),
      section('Sounds',
        toggle({ id: 'sfx', label: 'Sound effects', hint: 'Chimes and dings. The voice always speaks.', checked: s.sfx, onChange: (v) => { s.sfx = v; ctx.sfx?.setEnabled(v); commit(); } }),
      ),
      section('Games in the playroom',
        el('p', { class: 'hint left', text: 'Switch off a game that isn’t right for your child yet. Their progress is kept, and the game comes back when you switch it on.' }),
        ...gameToggles,
      ),
      section('Readers', readerList,
        el('p', { class: 'hint left', text: 'Up to 6 readers per device. New readers are added from the “Who’s playing?” screen. Progress shows each reader’s levels, stars and what they find tricky, on this screen only.' })),
      ...gameSections,
      section('Privacy',
        el('p', { text: 'No accounts, no ads, no analytics, no tracking. The playroom makes no network requests beyond loading its own files. Names, scores and settings are saved only on this device (in the browser’s local storage) and never leave it.' }),
        el('p', { text: 'Pip speaks with a voice on this device whenever there is one. A voice marked “uses the internet” sends the words it says to an online speech service run by your browser or device maker.' }),
        imported
          ? el('p', { class: 'hint left', text: `Readers and stars from the Reading Game were brought over on ${new Date(imported.at).toLocaleDateString()}. The Reading Game’s own saved data was left as it was.` })
          : null,
        ctx.store && !ctx.store.available
          ? el('p', { class: 'notice', text: 'This browser is not allowing the playroom to save right now (for example in private browsing), so nothing will be remembered after you close it.' })
          : null),
    ),
  );

  return {
    node,
    title: 'Grown-ups',
    destroy() {
      cleanups.forEach((fn) => fn());
    },
  };
});
