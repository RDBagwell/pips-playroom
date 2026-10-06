// Shared bits of UI used by several screens.

import { el } from './dom.js';
import { avatarFor } from './profiles.js';

export function screen(name, ...children) {
  return el('section', { class: `screen screen-${name}` }, ...children);
}

/** Top bar: optional back button, title, and optional actions on the right. */
export function topbar({ back, backLabel = 'Back', title, actions = [] }) {
  return el('header', { class: 'topbar' },
    back
      ? el('button', { type: 'button', class: 'icon-button', 'aria-label': backLabel, title: backLabel, on: { click: back } },
        el('span', { 'aria-hidden': 'true', text: '⬅' }))
      : el('span', { class: 'topbar-spacer' }),
    el('h1', { class: 'topbar-title', text: title }),
    el('div', { class: 'topbar-actions' }, ...actions),
  );
}

export function iconButton({ icon, label, onClick, className = '' }) {
  return el('button', { type: 'button', class: `icon-button ${className}`.trim(), 'aria-label': label, title: label, on: { click: onClick } },
    el('span', { 'aria-hidden': 'true', text: icon }));
}

export function avatarBadge(profile, { size = 'md' } = {}) {
  const a = avatarFor(profile.avatar);
  return el('span', { class: `avatar avatar-${size}`, role: 'img', 'aria-label': a.label }, a.emoji);
}

export function notice(text, kind = 'info') {
  return el('p', { class: `notice notice-${kind}`, role: 'status', text });
}

export function starRow(count, max = 3, { size = 'sm' } = {}) {
  return el('span', { class: `star-row star-row-${size}`, role: 'img', 'aria-label': `${count} of ${max} stars` },
    ...Array.from({ length: max }, (_, i) => el('span', { class: i < count ? 'star on' : 'star', 'aria-hidden': 'true', text: '★' })));
}
