// Friendly confirm / prompt dialogs built on <dialog> (no window.confirm).

import { el } from './dom.js';

function open({ title, message, confirmLabel, danger, input }) {
  return new Promise((resolve) => {
    const field = input
      ? el('input', { type: 'text', class: 'name-input', value: input.value || '', maxlength: input.maxlength || 40, 'aria-label': input.label, autocomplete: 'off' })
      : null;
    const error = el('p', { class: 'form-error', 'aria-live': 'polite' });
    const dialog = el('dialog', { class: 'dialog panel', 'aria-labelledby': 'dialog-title' });
    const finish = (value) => {
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    const confirm = () => {
      if (!field) return finish(true);
      const check = input.validate ? input.validate(field.value) : { ok: true };
      if (!check.ok) {
        error.textContent = check.error;
        field.focus();
        return undefined;
      }
      return finish(field.value);
    };
    dialog.append(
      el('h2', { id: 'dialog-title', text: title }),
      message ? el('p', { text: message }) : null,
      field,
      field ? error : null,
      el('div', { class: 'dialog-actions' },
        el('button', { type: 'button', class: 'big-button secondary', on: { click: () => finish(field ? null : false) } }, 'Cancel'),
        el('button', { type: 'button', class: `big-button${danger ? ' danger' : ''}`, on: { click: confirm } }, confirmLabel)),
    );
    if (field) field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(field ? null : false);
    });
    document.body.append(dialog);
    dialog.showModal();
    (field || dialog.querySelector('button')).focus();
  });
}

export function confirmDialog(opts) {
  return open(opts);
}

export function promptDialog(opts) {
  return open(opts);
}
