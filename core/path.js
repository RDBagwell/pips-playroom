// Positions for the level map's winding path (a "snake" through a grid).

/** Grid cell for stone `i`: rows go left-to-right, then right-to-left. */
export function snakeCell(i, cols) {
  const row = Math.floor(i / cols);
  const pos = i % cols;
  return { row, col: row % 2 === 0 ? pos : cols - 1 - pos };
}

/** Which way the path leaves stone `i` to reach stone `i + 1`. */
export function snakeLink(i, cols) {
  const a = snakeCell(i, cols);
  const b = snakeCell(i + 1, cols);
  if (b.row > a.row) return 'down';
  return b.col > a.col ? 'right' : 'left';
}
