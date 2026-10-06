// Building blocks for the grown-ups' corner, shared by the hub and every
// game's own settings section.

import { el } from './dom.js';

export function section(title, ...children) {
  return el('section', { class: 'panel settings-section' }, el('h2', { text: title }), ...children);
}

export function toggle({ id, label, hint, checked, onChange, disabled = false }) {
  const input = el('input', { type: 'checkbox', id, class: 'switch-input', role: 'switch', disabled, on: { change: (e) => onChange(e.target.checked) } });
  input.checked = checked;
  return el('div', { class: 'setting-row' },
    el('label', { for: id, class: 'setting-label' }, el('span', { text: label }), hint ? el('small', { text: hint }) : null),
    el('span', { class: 'switch' }, input, el('span', { class: 'switch-track', 'aria-hidden': 'true' })),
  );
}

/** A grown-up-facing table: headers, then rows of cells (strings or nodes). */
export function table(className, headers, rows) {
  return el('div', { class: 'table-wrap' },
    el('table', { class: className },
      el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col', text: h })))),
      el('tbody', {}, ...rows.map((cells) => el('tr', {}, ...cells.map((c) => (c instanceof Node ? el('td', {}, c) : el('td', { text: c }))))))));
}
