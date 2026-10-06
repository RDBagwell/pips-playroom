import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, save, takeNotice } from '../context.js';
import { screen, topbar, iconButton, avatarBadge, notice } from '../ui.js';
import { AVATARS, MAX_PROFILES, NAME_MAX, addProfile } from '../profiles.js';
import { totalStars } from '../progress.js';

register('profiles', () => {
  const { record } = ctx;
  const msg = takeNotice();

  function choose(profile) {
    ctx.sfx?.play('tap');
    record.activeProfileId = profile.id;
    save();
    ctx.speech.say(`Hi, ${profile.name}!`);
    go('map');
  }

  const tiles = record.profiles.map((p) =>
    el('li', {},
      el('button', { type: 'button', class: 'profile-tile', on: { click: () => choose(p) } },
        avatarBadge(p, { size: 'lg' }),
        el('span', { class: 'profile-name', text: p.name }),
        el('span', { class: 'profile-stars', text: `★ ${totalStars(p)}` }),
      )));

  if (record.profiles.length < MAX_PROFILES) {
    tiles.push(el('li', {},
      el('button', { type: 'button', class: 'profile-tile profile-new', on: { click: () => go('new-profile') } },
        el('span', { class: 'avatar avatar-lg', 'aria-hidden': 'true', text: '＋' }),
        el('span', { class: 'profile-name', text: 'New reader' }),
      )));
  }

  const node = screen('profiles',
    topbar({
      title: "Who's reading?",
      actions: [
        iconButton({ icon: '🏆', label: 'Best readers', onClick: () => go('scores', { from: 'profiles' }) }),
        iconButton({ icon: '⚙️', label: 'Grown-ups', onClick: () => go('gate', { next: 'settings', from: 'profiles' }) }),
      ],
    }),
    msg && notice(msg),
    el('ul', { class: 'profile-grid', role: 'list' }, ...tiles),
    record.profiles.length >= MAX_PROFILES &&
      el('p', { class: 'hint', text: `Up to ${MAX_PROFILES} readers can play on this device. A grown-up can remove one in settings.` }),
  );
  return { node, title: "Who's reading?" };
});

register('new-profile', () => {
  const { record } = ctx;
  const msg = takeNotice();
  let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)].id;

  const error = el('p', { class: 'form-error', id: 'name-error', 'aria-live': 'polite' });
  const input = el('input', {
    type: 'text', id: 'reader-name', class: 'name-input', maxlength: NAME_MAX, autocomplete: 'off',
    autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'go', 'aria-describedby': 'name-error name-hint',
  });

  const avatarButtons = AVATARS.map((a) =>
    el('button', {
      type: 'button', class: 'avatar-choice', 'aria-label': a.label, 'aria-pressed': String(a.id === avatar),
      on: {
        click: (e) => {
          avatar = a.id;
          avatarButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
          ctx.sfx?.play('tap');
          ctx.speech.say(`${a.label}!`);
        },
      },
    }, el('span', { 'aria-hidden': 'true', text: a.emoji })));

  function submit(e) {
    e.preventDefault();
    const result = addProfile(record, { name: input.value, avatar });
    if (!result.ok) {
      error.textContent = result.error;
      input.setAttribute('aria-invalid', 'true');
      ctx.sfx?.play('soft');
      input.focus();
      return;
    }
    record.activeProfileId = result.profile.id;
    save();
    ctx.sfx?.play('correct');
    ctx.speech.say(`Hi, ${result.profile.name}! Let's read!`);
    go('map');
  }

  const form = el('form', { class: 'panel new-profile-form', novalidate: true, on: { submit } },
    el('h2', { class: 'form-label', id: 'avatar-label', text: '1. Pick your animal' }),
    el('div', { class: 'avatar-grid', role: 'group', 'aria-labelledby': 'avatar-label' }, ...avatarButtons),
    el('label', { class: 'form-label', for: 'reader-name', text: '2. Type your name' }),
    input,
    el('p', { class: 'hint', id: 'name-hint', text: `Up to ${NAME_MAX} letters. A grown-up can help!` }),
    error,
    el('button', { type: 'submit', class: 'big-button' }, "Let's go! ", el('span', { 'aria-hidden': 'true', text: '➜' })),
  );

  const node = screen('new-profile',
    topbar({
      title: 'New reader',
      back: record.profiles.length ? () => go('profiles') : null,
    }),
    msg && notice(msg),
    form,
  );
  return { node, title: 'New reader', focus: avatarButtons.find((b) => b.getAttribute('aria-pressed') === 'true') };
});

