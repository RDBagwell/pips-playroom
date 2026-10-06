// Layout checks run in the page by the screenshot script (and by hand).
// Each returns a list of problems in plain words (empty when fine).

/** Every visible speech bubble's tail points at Pip and reaches him. */
export function checkBubbleTails() {
  const problems = [];
  for (const bubble of document.querySelectorAll('.speech-bubble')) {
    if (!bubble.offsetParent || !bubble.textContent.trim()) continue;
    const pip = bubble.parentElement.querySelector('.mascot');
    if (!pip) continue;
    const b = bubble.getBoundingClientRect();
    const m = pip.getBoundingClientRect();
    const tail = getComputedStyle(bubble, '::before');
    const left = parseFloat(tail.left);
    const top = parseFloat(tail.top);
    const pipAbove = m.bottom <= b.top + 2;
    const pipLeft = m.right <= b.left + 2;
    if (pipAbove) {
      if (!(top < 0)) problems.push(`bubble "${bubble.textContent.slice(0, 20)}…": Pip is above it but the tail isn't on top`);
      const tipY = b.top + top;
      if (tipY - m.bottom > 8) problems.push(`bubble tail stops ${Math.round(tipY - m.bottom)}px short of Pip (above)`);
      const tipX = b.left + b.width / 2;
      if (tipX < m.left || tipX > m.right) problems.push('bubble tail (top) is not under Pip');
    } else if (pipLeft) {
      if (!(left < 0)) problems.push(`bubble "${bubble.textContent.slice(0, 20)}…": Pip is to the left but the tail isn't on the left`);
      const tipX = b.left + left;
      if (tipX - m.right > 8) problems.push(`bubble tail stops ${Math.round(tipX - m.right)}px short of Pip (left)`);
      const tipY = b.top + b.height / 2;
      if (tipY < m.top || tipY > m.bottom) problems.push('bubble tail (left) is not beside Pip');
    } else {
      problems.push(`bubble "${bubble.textContent.slice(0, 20)}…" is neither beside nor below Pip`);
    }
  }
  return problems;
}

/** Panels in a settings grid stack without gaps: none sits more than `gap` px below the one above it. */
export function checkPanelGaps(maxGap = 24) {
  const problems = [];
  for (const grid of document.querySelectorAll('.settings-grid')) {
    if (!grid.offsetParent) continue;
    const panels = [...grid.children].filter((p) => p.offsetParent).map((p) => ({ p, r: p.getBoundingClientRect() }));
    for (const { p, r } of panels) {
      const above = panels
        .filter((o) => o.p !== p && Math.abs(o.r.left - r.left) < 4 && o.r.bottom <= r.top + 1)
        .sort((a, b2) => b2.r.bottom - a.r.bottom)[0];
      if (above && r.top - above.r.bottom > maxGap) {
        const name = (el) => (el.querySelector('h2')?.textContent || el.className).slice(0, 30);
        problems.push(`gap of ${Math.round(r.top - above.r.bottom)}px between "${name(above.p)}" and "${name(p)}"`);
      }
    }
  }
  return problems;
}

/** On the sticker book: every placed sticker is fully on its page, and the page fits on screen. */
export function checkStickerPage() {
  const problems = [];
  const scene = document.querySelector('.scene');
  if (!scene) return problems;
  const s = scene.getBoundingClientRect();
  for (const p of scene.querySelectorAll('.placed')) {
    const r = p.getBoundingClientRect();
    const cut = Math.max(s.left - r.left, r.right - s.right, s.top - r.top, r.bottom - s.bottom);
    if (cut > 1) problems.push(`the ${p.dataset.id} sticker is cut off by ${Math.round(cut)}px`);
  }
  // The whole page is in view without scrolling, so a child sees every sticker they place.
  const bottom = s.bottom + scrollY;
  if (bottom > innerHeight + 1) problems.push(`the page's bottom edge is ${Math.round(bottom - innerHeight)}px below the screen`);
  for (const b of document.querySelectorAll('.tray-sticker, .scene-tabs button')) {
    const r = b.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) problems.push(`"${b.getAttribute('aria-label') || b.textContent}" sticks out sideways`);
    if (r.width < 63.5 || r.height < 63.5) problems.push(`"${b.getAttribute('aria-label') || b.textContent}" is smaller than 64px (${Math.round(r.width)}×${Math.round(r.height)})`);
  }
  const wide = Math.max(document.documentElement.scrollWidth, innerWidth) - innerWidth;
  if (wide > 1) problems.push(`the page scrolls sideways by ${wide}px`);
  return problems;
}
