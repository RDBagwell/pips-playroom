// Grown-ups' corner: voice, speed, sounds, word case, unlocking, readers,
// plus how to play and what each level practises.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, settings, save } from '../context.js';
import { screen, topbar, avatarBadge } from '../ui.js';
import { rankEnglishVoices, MIN_RATE, MAX_RATE, DEFAULT_RATE } from '../speech.js';
import { renameProfile, deleteProfile, resetProfile, NAME_MAX, validateName } from '../profiles.js';
import { totalStars } from '../progress.js';
import { formatWord } from '../text.js';
import { confirmDialog, promptDialog } from '../dialog.js';

function section(title, ...children) {
  return el('section', { class: 'panel settings-section' }, el('h2', { text: title }), ...children);
}

function toggle({ id, label, hint, checked, onChange }) {
  const input = el('input', { type: 'checkbox', id, class: 'switch-input', role: 'switch', on: { change: (e) => onChange(e.target.checked) } });
  input.checked = checked;
  return el('div', { class: 'setting-row' },
    el('label', { for: id, class: 'setting-label' }, el('span', { text: label }), hint ? el('small', { text: hint }) : null),
    el('span', { class: 'switch' }, input, el('span', { class: 'switch-track', 'aria-hidden': 'true' })),
  );
}

register('settings', ({ from = 'map' } = {}) => {
  const s = settings();
  const { speech } = ctx;
  const cleanups = [];
  const commit = () => save();
  const back = () => go(from === 'profiles' || !ctx.record.activeProfileId ? 'profiles' : 'map');

  // ----- voice -----
  const voiceSelect = el('select', { id: 'voice', class: 'select' });
  function fillVoices() {
    const english = rankEnglishVoices(speech.voices);
    const others = speech.voices.filter((v) => !english.includes(v));
    const current = speech.voice ? speech.voice.voiceURI : '';
    const option = (v) => {
      const o = el('option', { value: v.voiceURI, text: `${v.name} (${v.lang})` });
      o.selected = v.voiceURI === current;
      return o;
    };
    const auto = el('option', { value: '', text: 'Automatic (best English voice)' });
    auto.selected = !s.voiceURI;
    const groups = [auto];
    if (english.length) groups.push(el('optgroup', { label: 'English' }, ...english.map(option)));
    if (others.length) groups.push(el('optgroup', { label: 'Other languages' }, ...others.map(option)));
    voiceSelect.replaceChildren(...groups);
  }
  fillVoices();
  cleanups.push(speech.onVoicesChanged(fillVoices));
  voiceSelect.addEventListener('change', () => {
    s.voiceURI = voiceSelect.value || null;
    speech.setPreferredVoice(s.voiceURI);
    commit();
    speech.say('Find the word… cat');
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
    speech.say('Find the word… dog');
  });
  showRate();

  // ----- word case -----
  const casePreview = el('span', { class: 'case-preview' });
  const showCase = () => { casePreview.textContent = ['cat', 'I', 'ship'].map((w) => formatWord(w, s.wordCase)).join('  '); };
  const caseRadios = [['lower', 'lowercase (recommended)'], ['title', 'Title Case']].map(([value, text]) => {
    const input = el('input', { type: 'radio', name: 'word-case', value, id: `case-${value}` });
    input.checked = s.wordCase === value;
    input.addEventListener('change', () => { s.wordCase = value; commit(); showCase(); });
    return el('label', { class: 'radio', for: `case-${value}` }, input, el('span', { text }));
  });
  showCase();

  // ----- readers -----
  const readerList = el('ul', { class: 'reader-list' });
  function renderReaders() {
    const rows = ctx.record.profiles.map((p) => el('li', { class: 'reader-row' },
      avatarBadge(p),
      el('span', { class: 'reader-name' }, el('strong', { text: p.name }), el('small', { text: `★ ${totalStars(p)} · ${p.totalScore.toLocaleString()} points · up to level ${Math.min(p.unlocked, ctx.levels.length)}` })),
      el('span', { class: 'reader-actions' },
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
      message: 'Stars, best scores and unlocked levels go back to the start. This can’t be undone.',
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

  // ----- how to play / levels -----
  const levelTable = el('table', { class: 'level-table' },
    el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: '#' }), el('th', { scope: 'col', text: 'Level' }), el('th', { scope: 'col', text: 'Practises' }), el('th', { scope: 'col', text: 'Cards' }))),
    el('tbody', {}, ...ctx.levels.map((l) => el('tr', {},
      el('td', { text: l.id }),
      el('td', {}, el('span', { 'aria-hidden': 'true', text: `${l.emoji} ` }), l.name),
      el('td', {}, el('strong', { text: l.focus }), l.about ? el('br') : null, l.about ? el('small', { text: l.about }) : null),
      el('td', { text: l.cards })))));

  const node = screen('settings',
    topbar({ title: 'Grown-ups’ corner', back, backLabel: 'Back to the game' }),
    el('div', { class: 'settings-grid' },
      section('Voice',
        el('label', { for: 'voice', class: 'setting-label', text: 'Which voice reads the words' }),
        voiceSelect,
        el('p', { class: 'hint left', text: 'Voices come from this device. If the list is short, you can add voices in your device’s accessibility or speech settings.' }),
        el('label', { for: 'rate', class: 'setting-label' }, 'Speaking speed ', rateOut),
        el('div', { class: 'range-row' }, el('span', { 'aria-hidden': 'true', text: '🐢' }), rate, el('span', { 'aria-hidden': 'true', text: '🐇' })),
        el('button', { type: 'button', class: 'small-button', on: { click: () => { s.rate = DEFAULT_RATE; rate.value = String(DEFAULT_RATE); speech.setRate(DEFAULT_RATE); showRate(); commit(); } } }, 'Reset speed'),
        el('button', { type: 'button', class: 'small-button', on: { click: () => speech.say('Find the word… rabbit') } }, '🔊 Test voice'),
      ),
      section('Game',
        toggle({ id: 'sfx', label: 'Sound effects', hint: 'Chimes and dings. The voice always speaks.', checked: s.sfx, onChange: (v) => { s.sfx = v; ctx.sfx?.setEnabled(v); commit(); } }),
        el('fieldset', { class: 'radio-group' },
          el('legend', { class: 'setting-label', text: 'How words look' }),
          ...caseRadios,
          el('p', { class: 'hint left' }, 'Preview: ', casePreview)),
        toggle({ id: 'unlock', label: 'Unlock all levels', hint: 'For older readers or a teacher picking a level.', checked: s.unlockAll, onChange: (v) => { s.unlockAll = v; commit(); } }),
      ),
      section('Readers', readerList,
        el('p', { class: 'hint left', text: 'Up to 6 readers per device. New readers are added from the “Who’s reading?” screen.' })),
      section('How to play',
        el('ol', { class: 'how-list' },
          el('li', { text: 'Pip the owl says a word out loud: “Find the word… cat.”' }),
          el('li', { text: 'Your child taps the card with that word. Tap 🔊 to hear it again.' }),
          el('li', { text: 'A wrong tap is never punished: the game reads the tapped word (“That word is hat”), then asks again. Missed words come back later in the level for another try.' }),
          el('li', { text: 'Find 8 words to finish a level. Stars come from how many were right on the first try, and finishing opens the next level.' }),
          el('li', { text: 'Keyboard: number keys 1–9 pick a card, R repeats the word.' })),
        el('h3', { text: 'The levels' }),
        el('p', { class: 'hint left', text: 'The levels follow a standard early-reading (phonics) order, with common sight words mixed in. Later levels also make the wrong choices trickier: first they start with different letters, then they rhyme, then they look alike.' }),
        el('div', { class: 'table-wrap' }, levelTable),
      ),
      section('Privacy',
        el('p', { text: 'No accounts, no ads, no analytics, no tracking. The game makes no network requests beyond loading its own files. Names, scores and settings are saved only on this device (in the browser’s local storage) and never leave it.' }),
        ctx.store && !ctx.store.available
          ? el('p', { class: 'notice', text: 'This browser is not allowing the game to save right now (for example in private browsing), so nothing will be remembered after you close it.' })
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
