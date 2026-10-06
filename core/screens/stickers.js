// The sticker book: place the stickers you've earned on a few scene pages.
// Tap a sticker in the tray to put it on the page; drag it (or tap the page)
// to move it. Keyboard: arrow keys move the chosen sticker, Delete takes it
// off. The arrangement is saved for each reader.

import { el } from '../dom.js';
import { register, go } from '../router.js';
import { ctx, activeProfile, save, prefersReducedMotion } from '../context.js';
import { screen, topbar } from '../ui.js';
import { allStars } from '../progress.js';
import {
  STICKERS, SCENES, MAX_PER_SCENE, freshStickerBook, unlockedStickers, nextSticker, nextStickerText, stickerById,
  sceneStickers, placeSticker, moveSticker, removeSticker, markSeen,
} from '../stickers.js';
import { stickerSvg, sceneSvg } from '../sticker-art.js';

const STEP = 4; // percent per arrow-key press

register('stickers', ({ scene: sceneId = SCENES[0].id } = {}) => {
  const profile = activeProfile();
  if (!profile) return { redirect: 'profiles' };
  if (!profile.stickers) profile.stickers = freshStickerBook();
  const book = profile.stickers;
  const stars = allStars(profile);
  markSeen(book, stars);
  save();
  const scene = SCENES.find((s) => s.id === sceneId) || SCENES[0];
  let selected = -1; // index of the chosen sticker on this page
  let drag = null;

  // ----- the page -----
  const page = el('div', { class: `scene scene-${scene.id}`, role: 'group', 'aria-label': `${scene.name} page. Tap a sticker below to add it.` },
    sceneSvg(scene.id));
  const layer = el('div', { class: 'scene-layer' });
  page.append(layer);
  const takeOff = el('button', { type: 'button', class: 'big-button secondary sticker-off', hidden: true, on: { click: () => remove() } },
    el('span', { 'aria-hidden': 'true', text: '↩ ' }), 'Take it off');
  const status = el('p', { class: 'sr-only', 'aria-live': 'polite' });

  function renderPage() {
    const list = sceneStickers(book, scene.id);
    layer.replaceChildren(...list.map((p, i) => {
      const s = stickerById(p.id);
      if (!s || stars < s.at) return null; // re-locked after a grown-up reset: kept, but not shown
      const b = el('button', {
        type: 'button',
        class: `placed${i === selected ? ' chosen' : ''}`,
        // Saved as the centre in %; CSS keeps the whole sticker on the page (see .placed).
        style: { '--x': `${p.x}%`, '--y': `${p.y}%` },
        'aria-label': `${s.name} sticker${i === selected ? ', chosen. Arrow keys move it, Delete takes it off' : ''}`,
        'aria-pressed': String(i === selected),
        dataset: { index: String(i), id: p.id },
      }, stickerSvg(p.id));
      b.addEventListener('pointerdown', (e) => startDrag(e, i, b));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (drag && drag.moved) return;
        choose(i);
      });
      b.addEventListener('keydown', (e) => onStickerKey(e, i));
      return b;
    }).filter(Boolean));
    takeOff.hidden = selected < 0;
  }

  function choose(i) {
    selected = i;
    renderPage();
    const b = layer.querySelector(`[data-index="${i}"]`);
    if (b) b.focus();
  }

  function persist() {
    save();
  }

  // Tap the page to move the chosen sticker there.
  page.addEventListener('click', (e) => {
    if (selected < 0 || e.target.closest('.placed')) return;
    const r = page.getBoundingClientRect();
    if (!r.width) return;
    moveSticker(book, scene.id, selected, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
    persist();
    ctx.sfx?.play('tap');
    choose(selected);
  });

  function startDrag(e, i, b) {
    if (e.button !== undefined && e.button !== 0) return;
    const r = page.getBoundingClientRect();
    if (!r.width) return;
    drag = { i, r, moved: false, x0: e.clientX, y0: e.clientY };
    selected = i;
    b.classList.add('dragging');
    try {
      b.setPointerCapture(e.pointerId);
    } catch {
      /* not supported: dragging still works while the pointer stays on it */
    }
    const move = (ev) => {
      if (!drag) return;
      if (Math.abs(ev.clientX - drag.x0) + Math.abs(ev.clientY - drag.y0) > 4) drag.moved = true;
      const x = Math.min(100, Math.max(0, ((ev.clientX - r.left) / r.width) * 100));
      const y = Math.min(100, Math.max(0, ((ev.clientY - r.top) / r.height) * 100));
      b.style.setProperty('--x', `${x}%`);
      b.style.setProperty('--y', `${y}%`);
      drag.x = x;
      drag.y = y;
    };
    const end = () => {
      b.removeEventListener('pointermove', move);
      b.removeEventListener('pointerup', end);
      b.removeEventListener('pointercancel', end);
      b.classList.remove('dragging');
      const d = drag;
      if (d && d.moved) {
        moveSticker(book, scene.id, d.i, d.x, d.y);
        persist();
        ctx.sfx?.play('tap');
        choose(d.i);
      }
      setTimeout(() => { drag = null; }, 0);
    };
    b.addEventListener('pointermove', move);
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
  }

  function onStickerKey(e, i) {
    const p = sceneStickers(book, scene.id)[i];
    if (!p) return;
    const moves = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      moveSticker(book, scene.id, i, p.x + dx, p.y + dy);
      persist();
      choose(i);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      selected = i;
      remove();
    } else if (e.key === 'Escape') {
      selected = -1;
      renderPage();
    }
  }

  function remove() {
    if (selected < 0) return;
    const s = stickerById(sceneStickers(book, scene.id)[selected]?.id);
    removeSticker(book, scene.id, selected);
    selected = -1;
    persist();
    ctx.sfx?.play('soft');
    renderPage();
    status.textContent = s ? `The ${s.name} is back in the tray.` : '';
  }

  // ----- the tray -----
  const unlocked = unlockedStickers(stars);
  function add(stickerId) {
    const count = sceneStickers(book, scene.id).length;
    if (count >= MAX_PER_SCENE) {
      ctx.speech.say('This page is full! Take a sticker off first.');
      return;
    }
    // New stickers go near the middle, a little apart, so they're easy to find.
    const x = 30 + ((count * 17) % 41);
    const y = 35 + ((count * 23) % 31);
    const i = placeSticker(book, scene.id, stickerId, x, y, stars);
    if (i < 0) return;
    persist();
    ctx.sfx?.play('correct');
    const s = stickerById(stickerId);
    ctx.speech.say(`${s.name.charAt(0).toUpperCase()}${s.name.slice(1)}!`);
    status.textContent = `${s.name} added to the page. Drag it, or tap the page, to move it.`;
    choose(i);
  }

  const tray = el('ul', { class: 'sticker-tray', role: 'list', 'aria-label': 'Your stickers' },
    ...STICKERS.map((s) => {
      const open = unlocked.includes(s);
      return el('li', {},
        open
          ? el('button', { type: 'button', class: 'tray-sticker', 'aria-label': `Add the ${s.name}`, dataset: { id: s.id }, on: { click: () => add(s.id) } }, stickerSvg(s.id))
          : el('span', { class: 'tray-sticker locked', role: 'img', 'aria-label': `Locked: ${s.at} stars` },
            stickerSvg(s.id, { locked: true }), el('span', { class: 'tray-lock', text: `★${s.at}` })));
    }));

  const next = nextSticker(stars);
  const node = screen('stickers',
    topbar({ title: 'Sticker Book', back: () => go('hub'), backLabel: 'Back to the playroom' }),
    el('p', { class: 'sticker-count' },
      el('strong', { text: `${unlocked.length} of ${STICKERS.length} stickers` }),
      el('span', { class: 'next-sticker' }, nextStickerText(stars),
        next ? el('span', { class: 'next-sticker-art', 'aria-hidden': 'true' }, stickerSvg(next.sticker.id, { locked: true })) : null)),
    el('div', { class: 'scene-tabs', role: 'group', 'aria-label': 'Pages' },
      // Short labels on screens too short for the long ones (see playroom.css).
      ...SCENES.map((s) => el('button', {
        type: 'button', class: 'small-button', 'aria-pressed': String(s.id === scene.id), 'aria-label': s.name,
        on: { click: () => go('stickers', { scene: s.id }) },
      }, el('span', { class: 'tab-long', text: s.name }), el('span', { class: 'tab-short', 'aria-hidden': 'true', text: s.short })))),
    page,
    takeOff,
    unlocked.length
      ? null
      : el('p', { class: 'panel empty', text: 'Play any game and earn a star to get your first sticker!' }),
    tray,
    status,
  );
  renderPage();
  if (prefersReducedMotion()) node.classList.add('calm');
  return { node, title: 'Sticker book', focus: node.querySelector('.tray-sticker') || node.querySelector('h1') };
});
