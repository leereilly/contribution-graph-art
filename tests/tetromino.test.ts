import { describe, it, expect } from 'vitest';
import {
  TETROMINOES,
  rotateShape,
  getRotatedShape,
  shapeWidth,
  shapeHeight,
  canPlace,
  generateTetrominoes,
} from '../src/tetromino.js';
import { computeFallingAnimation } from '../src/animator.js';
import { Grid, Palette, ContributionCell, PlacedLogo, LogoDefinition } from '../src/types.js';

// Helper to make a simple 53×7 grid filled with level-0 cells
function makeGrid(cols = 53): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cols; c++) {
    grid[c] = [];
    for (let r = 0; r < 7; r++) {
      grid[c][r] = {
        x: c,
        y: r,
        date: '2024-01-01',
        count: 0,
        level: 0,
      } satisfies ContributionCell;
    }
  }
  return grid;
}

const testPalette: Palette = {
  name: 'test',
  colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

const msLogo: LogoDefinition = {
  name: 'Microsoft',
  width: 2,
  height: 2,
  cells: [
    { relX: 0, relY: 0, color: '#F25022' },
    { relX: 1, relY: 0, color: '#7FBA00' },
    { relX: 0, relY: 1, color: '#00A4EF' },
    { relX: 1, relY: 1, color: '#FFB900' },
  ],
};

// ─── Tetromino definitions ──────────────────────────────────────────

describe('TETROMINOES', () => {
  it('has 7 pieces', () => {
    expect(TETROMINOES).toHaveLength(7);
  });

  it('each piece has 4 cells', () => {
    for (const piece of TETROMINOES) {
      expect(piece.shape).toHaveLength(4);
    }
  });

  it('piece names are I, O, T, S, Z, L, J', () => {
    expect(TETROMINOES.map((p) => p.name)).toEqual([
      'I', 'O', 'T', 'S', 'Z', 'L', 'J',
    ]);
  });
});

// ─── Rotation ───────────────────────────────────────────────────────

describe('rotateShape', () => {
  it('rotates I-piece from horizontal to vertical', () => {
    const horizontal: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0]];
    const vertical = rotateShape(horizontal);
    expect(vertical).toEqual(expect.arrayContaining([[0, 0], [0, 1], [0, 2], [0, 3]]));
    expect(vertical).toHaveLength(4);
  });

  it('rotates T-piece 90° CW', () => {
    const t: [number, number][] = [[0, 0], [1, 0], [2, 0], [1, 1]];
    const rotated = rotateShape(t);
    expect(rotated).toEqual(expect.arrayContaining([[1, 0], [0, 1], [1, 1], [1, 2]]));
  });

  it('O-piece is unchanged after rotation', () => {
    const o: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const rotated = rotateShape(o);
    const sorted = (s: [number, number][]) => [...s].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(sorted(rotated)).toEqual(sorted(o));
  });

  it('4 rotations return to original', () => {
    for (const piece of TETROMINOES) {
      let shape = piece.shape;
      for (let i = 0; i < 4; i++) shape = rotateShape(shape);
      const sorted = (s: [number, number][]) => [...s].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      expect(sorted(shape)).toEqual(sorted(piece.shape));
    }
  });
});

describe('getRotatedShape', () => {
  it('rotation 0 returns original', () => {
    const piece = TETROMINOES[0]; // I
    expect(getRotatedShape(piece, 0)).toEqual(piece.shape);
  });

  it('rotation 2 equals two rotations', () => {
    const piece = TETROMINOES[2]; // T
    const expected = rotateShape(rotateShape(piece.shape));
    const sorted = (s: [number, number][]) => [...s].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(sorted(getRotatedShape(piece, 2))).toEqual(sorted(expected));
  });
});

// ─── Shape dimensions ───────────────────────────────────────────────

describe('shapeWidth / shapeHeight', () => {
  it('I-piece horizontal: width 4, height 1', () => {
    const i = TETROMINOES[0];
    expect(shapeWidth(i.shape)).toBe(4);
    expect(shapeHeight(i.shape)).toBe(1);
  });

  it('O-piece: width 2, height 2', () => {
    const o = TETROMINOES[1];
    expect(shapeWidth(o.shape)).toBe(2);
    expect(shapeHeight(o.shape)).toBe(2);
  });

  it('T-piece: width 3, height 2', () => {
    const t = TETROMINOES[2];
    expect(shapeWidth(t.shape)).toBe(3);
    expect(shapeHeight(t.shape)).toBe(2);
  });

  it('I-piece vertical (rotation 1): width 1, height 4', () => {
    const shape = getRotatedShape(TETROMINOES[0], 1);
    expect(shapeWidth(shape)).toBe(1);
    expect(shapeHeight(shape)).toBe(4);
  });
});

// ─── canPlace ───────────────────────────────────────────────────────

describe('canPlace', () => {
  const iShape = TETROMINOES[0].shape; // width 4

  it('accepts valid placement in bounds', () => {
    expect(canPlace(iShape, 0, 53, null)).toBe(true);
    expect(canPlace(iShape, 49, 53, null)).toBe(true);
  });

  it('rejects placement out of bounds (right)', () => {
    expect(canPlace(iShape, 50, 53, null)).toBe(false);
  });

  it('rejects placement out of bounds (left)', () => {
    expect(canPlace(iShape, -1, 53, null)).toBe(false);
  });

  it('rejects placement overlapping logo columns', () => {
    const logo: PlacedLogo = { logo: msLogo, col: 51, row: 0 };
    expect(canPlace([[0, 0], [1, 0]], 51, 53, logo)).toBe(false);
    expect(canPlace([[0, 0], [1, 0]], 50, 53, logo)).toBe(false);
  });

  it('accepts placement not overlapping logo', () => {
    const logo: PlacedLogo = { logo: msLogo, col: 51, row: 0 };
    expect(canPlace([[0, 0], [1, 0]], 48, 53, logo)).toBe(true);
  });
});

// ─── generateTetrominoes ────────────────────────────────────────────

describe('generateTetrominoes', () => {
  it('returns empty array for count 0', () => {
    expect(generateTetrominoes(0, 53, 1.5, null)).toEqual([]);
  });

  it('returns requested number of pieces (no logo)', () => {
    const pieces = generateTetrominoes(3, 53, 1.5, null);
    expect(pieces).toHaveLength(3);
  });

  it('assigns staggered beginOffsets', () => {
    const pieces = generateTetrominoes(3, 53, 1.5, null);
    expect(pieces.map((p) => p.beginOffset)).toEqual([0, 1.5, 3.0]);
  });

  it('pieces are within grid bounds', () => {
    const pieces = generateTetrominoes(5, 53, 1.5, null);
    for (const p of pieces) {
      const shape = getRotatedShape(p.piece, p.rotation);
      for (const [dx] of shape) {
        expect(p.col + dx).toBeGreaterThanOrEqual(0);
        expect(p.col + dx).toBeLessThan(53);
      }
    }
  });

  it('avoids logo columns', () => {
    const logo: PlacedLogo = { logo: msLogo, col: 51, row: 0 };
    const pieces = generateTetrominoes(9, 53, 1.5, logo);
    const logoCols = new Set([51, 52]);
    for (const p of pieces) {
      const shape = getRotatedShape(p.piece, p.rotation);
      for (const [dx] of shape) {
        expect(logoCols.has(p.col + dx)).toBe(false);
      }
    }
  });
});

// ─── computeFallingAnimation ────────────────────────────────────────

describe('computeFallingAnimation', () => {
  it('produces keyframes for a simple piece', () => {
    const grid = makeGrid(53);
    const piece = TETROMINOES[1]; // O-piece, 2×2
    const placed = { piece, col: 10, rotation: 0, beginOffset: 0 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    expect(keyframes.length).toBeGreaterThan(0);
  });

  it('all keyframes have valid grid coordinates', () => {
    const grid = makeGrid(53);
    const piece = TETROMINOES[2]; // T-piece
    const placed = { piece, col: 5, rotation: 0, beginOffset: 0 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    for (const kf of keyframes) {
      expect(kf.cellX).toBeGreaterThanOrEqual(0);
      expect(kf.cellX).toBeLessThan(53);
      expect(kf.cellY).toBeGreaterThanOrEqual(0);
      expect(kf.cellY).toBeLessThan(7);
    }
  });

  it('keyframe times are within [0, 1]', () => {
    const grid = makeGrid(53);
    const piece = TETROMINOES[0]; // I-piece
    const placed = { piece, col: 0, rotation: 0, beginOffset: 0 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    for (const kf of keyframes) {
      expect(kf.startTime).toBeGreaterThanOrEqual(0);
      expect(kf.endTime).toBeLessThanOrEqual(1.0);
      expect(kf.endTime).toBeGreaterThan(kf.startTime);
    }
  });

  it('respects beginOffset for staggered pieces', () => {
    const grid = makeGrid(53);
    const piece = TETROMINOES[2];
    const placed = { piece, col: 25, rotation: 0, beginOffset: 1.5 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    // With SVG begin attribute approach, keyTimes start from 0
    // and beginOffset is carried on each keyframe
    for (const kf of keyframes) {
      expect(kf.beginOffset).toBe(1.5);
    }
    const minStart = Math.min(...keyframes.map((kf) => kf.startTime));
    expect(minStart).toBeGreaterThanOrEqual(0);
    expect(minStart).toBeLessThan(0.2);
  });

  it('highlight color is always palette level 4', () => {
    const grid = makeGrid(53);
    const piece = TETROMINOES[2];
    const placed = { piece, col: 10, rotation: 0, beginOffset: 0 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    for (const kf of keyframes) {
      expect(kf.highlightColor).toBe('#216e39');
    }
  });

  it('base color reflects grid cell level', () => {
    const grid = makeGrid(10);
    // Set a cell to level 2
    grid[5][3] = { x: 5, y: 3, date: '2024-01-01', count: 5, level: 2 };
    const piece = TETROMINOES[1]; // O-piece 2×2
    const placed = { piece, col: 5, rotation: 0, beginOffset: 0 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    const kfAtCell = keyframes.filter((kf) => kf.cellX === 5 && kf.cellY === 3);
    expect(kfAtCell.length).toBeGreaterThan(0);
    expect(kfAtCell[0].baseColor).toBe('#40c463'); // level 2
  });

  it('a cell can have multiple keyframes (piece passes through)', () => {
    const grid = makeGrid(53);
    // T-piece has two cells in the same column (dx=1,dy=0 and dx=1,dy=1)
    const piece = TETROMINOES[2]; // T
    const placed = { piece, col: 10, rotation: 0, beginOffset: 0 };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    // Column 11 should have more keyframes than column 10
    const col11 = keyframes.filter((kf) => kf.cellX === 11);
    const col10 = keyframes.filter((kf) => kf.cellX === 10);
    expect(col11.length).toBeGreaterThan(col10.length);
  });
});
