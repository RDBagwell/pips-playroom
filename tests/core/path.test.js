import { describe, it, expect } from 'vitest';
import { snakeCell, snakeLink } from '../js/path.js';

describe('level map path', () => {
  it('snakes through the grid', () => {
    const cells = Array.from({ length: 7 }, (_, i) => snakeCell(i, 3));
    expect(cells).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
      { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
      { row: 2, col: 0 },
    ]);
  });

  it('links each stone to the next', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => snakeLink(i, 3))).toEqual(['right', 'right', 'down', 'left', 'left', 'down']);
  });
});
