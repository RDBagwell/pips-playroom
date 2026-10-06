// The sticker book: stars from every game add up to unlock stickers.
//
// Unlocks are deterministic and visible: each sticker has a fixed star count
// ("12 more stars for the next sticker!"). No randomness, no loot boxes,
// nothing time-limited, and nothing is ever taken away for not playing.
// Pure (no DOM); the art is in sticker-art.js.

export const STICKERS = [
  { id: 'sun', name: 'smiling sun', at: 1 },
  { id: 'fish', name: 'little fish', at: 3 },
  { id: 'bunny', name: 'bunny', at: 5 },
  { id: 'flower', name: 'flower', at: 8 },
  { id: 'crab', name: 'happy crab', at: 11 },
  { id: 'star', name: 'twinkly star', at: 14 },
  { id: 'frog', name: 'frog', at: 17 },
  { id: 'balloon', name: 'balloon', at: 21 },
  { id: 'whale', name: 'whale', at: 25 },
  { id: 'moon', name: 'sleepy moon', at: 29 },
  { id: 'ladybug', name: 'ladybug', at: 33 },
  { id: 'octopus', name: 'octopus', at: 38 },
  { id: 'rainbow', name: 'rainbow', at: 43 },
  { id: 'kitten', name: 'kitten', at: 48 },
  { id: 'starfish', name: 'starfish', at: 54 },
  { id: 'rocket', name: 'rocket', at: 60 },
  { id: 'snail', name: 'snail', at: 66 },
  { id: 'jellyfish', name: 'jellyfish', at: 72 },
  { id: 'cupcake', name: 'cupcake', at: 79 },
  { id: 'turtle', name: 'turtle', at: 86 },
  { id: 'shell', name: 'seashell', at: 93 },
  { id: 'sailboat', name: 'sailboat', at: 100 },
  { id: 'owlet', name: 'baby owl', at: 108 },
  { id: 'fox', name: 'fox', at: 116 },
];

export const STICKER_IDS = STICKERS.map((s) => s.id);

export const SCENES = [
  { id: 'beach', name: 'Sunny Beach', short: '🏖️ Beach' },
  { id: 'garden', name: 'Flower Garden', short: '🌷 Garden' },
  { id: 'night', name: 'Night Sky', short: '🌙 Night' },
];

export const SCENE_IDS = SCENES.map((s) => s.id);
export const MAX_PER_SCENE = 30;

export function freshStickerBook() {
  return { seen: 0, scenes: {} };
}

export function stickerById(id) {
  return STICKERS.find((s) => s.id === id) || null;
}

export function unlockedStickers(stars) {
  return STICKERS.filter((s) => stars >= s.at);
}

export function isUnlocked(id, stars) {
  const s = stickerById(id);
  return Boolean(s) && stars >= s.at;
}

/** The next sticker to earn and how many more stars it needs, or null when all are unlocked. */
export function nextSticker(stars) {
  const next = STICKERS.find((s) => stars < s.at);
  return next ? { sticker: next, more: next.at - stars } : null;
}

/** A sentence for the child: "3 more stars for the next sticker!" */
export function nextStickerText(stars) {
  const next = nextSticker(stars);
  if (!next) return 'You have every sticker!';
  return `${next.more} more ${next.more === 1 ? 'star' : 'stars'} for the next sticker!`;
}

/**
 * Stickers unlocked since the book was last looked at (for the celebration).
 * If stars went down (a grown-up reset a game), `seen` is lowered to match.
 */
export function newStickers(book, stars) {
  const unlocked = unlockedStickers(stars);
  if (book.seen > unlocked.length) book.seen = unlocked.length;
  return unlocked.slice(book.seen);
}

export function markSeen(book, stars) {
  book.seen = unlockedStickers(stars).length;
}

const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) * 10) / 10));

export function sceneStickers(book, sceneId) {
  if (!book.scenes[sceneId]) book.scenes[sceneId] = [];
  return book.scenes[sceneId];
}

/** Put a sticker on a page at x%, y%. Returns its index, or -1 when it can't go there. */
export function placeSticker(book, sceneId, stickerId, x, y, stars) {
  if (!SCENE_IDS.includes(sceneId) || !isUnlocked(stickerId, stars)) return -1;
  const list = sceneStickers(book, sceneId);
  if (list.length >= MAX_PER_SCENE) return -1;
  list.push({ id: stickerId, x: clamp(x), y: clamp(y) });
  return list.length - 1;
}

export function moveSticker(book, sceneId, index, x, y) {
  const s = sceneStickers(book, sceneId)[index];
  if (!s) return false;
  s.x = clamp(x);
  s.y = clamp(y);
  return true;
}

export function removeSticker(book, sceneId, index) {
  const list = sceneStickers(book, sceneId);
  if (!list[index]) return false;
  list.splice(index, 1);
  return true;
}

/** Check a sticker book read from storage. */
export function sanitizeStickerBook(raw) {
  const book = freshStickerBook();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return book;
  book.seen = Number.isInteger(raw.seen) && raw.seen >= 0 && raw.seen <= STICKERS.length ? raw.seen : 0;
  const scenes = raw.scenes && typeof raw.scenes === 'object' && !Array.isArray(raw.scenes) ? raw.scenes : {};
  for (const id of SCENE_IDS) {
    if (!Array.isArray(scenes[id])) continue;
    book.scenes[id] = scenes[id]
      .filter((p) => p && typeof p === 'object' && STICKER_IDS.includes(p.id) && Number.isFinite(p.x) && Number.isFinite(p.y))
      .slice(0, MAX_PER_SCENE)
      .map((p) => ({ id: p.id, x: clamp(p.x), y: clamp(p.y) }));
  }
  return book;
}
