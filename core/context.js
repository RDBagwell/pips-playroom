// Shared state for the running game. Screens read and update it.

export const ctx = {
  speech: null, // from speech.js
  sfx: null, // from sfx.js
  levels: [], // from levels.js
  store: null, // from storage.js
  record: null, // the saved record: { version, settings, profiles, activeProfileId }
  notice: null, // a gentle one-time message for the next screen
};

export function settings() {
  return ctx.record.settings;
}

export function activeProfile() {
  const { record } = ctx;
  return record.profiles.find((p) => p.id === record.activeProfileId) || null;
}

/** Save the record. Returns false when storage is unavailable (that's fine). */
export function save() {
  return ctx.store ? ctx.store.save(ctx.record) : false;
}

/** Take the pending notice, if any (shown once). */
export function takeNotice() {
  const n = ctx.notice;
  ctx.notice = null;
  return n;
}

export function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
