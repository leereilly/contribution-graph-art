import { describe, it, expect } from 'vitest';
import { computeFallingAnimation } from '../src/animator.js';
import { TETROMINOES, getRotatedShape } from '../src/tetromino.js';
import { buildGrid } from '../src/grid.js';
import { createSampleContributions } from './fixtures/sample-contributions.js';
import type { Grid, Palette, ContributionCell, PlacedTetromino } from '../src/types.js';

const testPalette: Palette = {
  name: 'test',
  colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

function makeGrid(cols = 53): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cols; c++) {
    grid[c] = [];
    for (let r = 0; r < 7; r++) {
      grid[c][r] = { x: c, y: r, date: '2024-01-01', count: 0, level: 0 as const };
    }
  }
  return grid;
}

describe('computeFallingAnimation', () => {
  it('returns keyframes for all affected cells', () => {
    const grid = makeGrid();
    const placed: PlacedTetromino = {
      piece: TETROMINOES[1], // O-piece, 2×2
      col: 10,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);
    expect(keyframes.length).toBeGreaterThan(0);

    // O-piece occupies cols 10,11 — keyframes should target both columns
    const cols = new Set(keyframes.map((kf) => kf.cellX));
    expect(cols.has(10)).toBe(true);
    expect(cols.has(11)).toBe(true);
  });

  it('keyframes have valid startTime and endTime (0 ≤ start < end ≤ 1)', () => {
    const grid = makeGrid();
    const placed: PlacedTetromino = {
      piece: TETROMINOES[0], // I-piece
      col: 0,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    for (const kf of keyframes) {
      expect(kf.startTime).toBeGreaterThanOrEqual(0);
      expect(kf.endTime).toBeLessThanOrEqual(1.0);
      expect(kf.endTime).toBeGreaterThan(kf.startTime);
    }
  });

  it('keyframes respect beginOffset via beginOffset field', () => {
    const grid = makeGrid();
    const placed: PlacedTetromino = {
      piece: TETROMINOES[2], // T-piece
      col: 25,
      rotation: 0,
      beginOffset: 1.5,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    // With the SVG begin attribute approach, keyTimes start from 0
    // and beginOffset is carried on each keyframe
    for (const kf of keyframes) {
      expect(kf.beginOffset).toBe(1.5);
    }
    const minStart = Math.min(...keyframes.map((kf) => kf.startTime));
    expect(minStart).toBeGreaterThanOrEqual(0);
    expect(minStart).toBeLessThan(0.2);
  });

  it('base colors match the grid cell palette color', () => {
    const grid = makeGrid(10);
    // Set specific levels
    grid[5][3] = { x: 5, y: 3, date: '2024-01-01', count: 5, level: 2 };
    grid[6][3] = { x: 6, y: 3, date: '2024-01-01', count: 10, level: 4 };

    const placed: PlacedTetromino = {
      piece: TETROMINOES[1], // O-piece 2×2
      col: 5,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    // Keyframes at (5,3) should have baseColor for level 2
    const kfAt53 = keyframes.filter((kf) => kf.cellX === 5 && kf.cellY === 3);
    expect(kfAt53.length).toBeGreaterThan(0);
    expect(kfAt53[0].baseColor).toBe(testPalette.colors[2]); // '#40c463'

    // Keyframes at (6,3) should have baseColor for level 4
    const kfAt63 = keyframes.filter((kf) => kf.cellX === 6 && kf.cellY === 3);
    expect(kfAt63.length).toBeGreaterThan(0);
    expect(kfAt63[0].baseColor).toBe(testPalette.colors[4]); // '#216e39'
  });

  it('highlight color is always palette.colors[4]', () => {
    const grid = makeGrid();
    const placed: PlacedTetromino = {
      piece: TETROMINOES[2], // T-piece
      col: 10,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    for (const kf of keyframes) {
      expect(kf.highlightColor).toBe(testPalette.colors[4]); // '#216e39'
    }
  });

  it('all keyframe cell positions are within grid bounds', () => {
    const grid = makeGrid(53);
    const placed: PlacedTetromino = {
      piece: TETROMINOES[2], // T-piece
      col: 5,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    for (const kf of keyframes) {
      expect(kf.cellX).toBeGreaterThanOrEqual(0);
      expect(kf.cellX).toBeLessThan(53);
      expect(kf.cellY).toBeGreaterThanOrEqual(0);
      expect(kf.cellY).toBeLessThan(7);
    }
  });

  it('works with contribution data from fixture', () => {
    const cells = createSampleContributions();
    const grid = buildGrid(cells);
    const placed: PlacedTetromino = {
      piece: TETROMINOES[0], // I-piece
      col: 20,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);
    expect(keyframes.length).toBeGreaterThan(0);

    // Base colors should reflect the varied levels in our fixture data
    const uniqueBaseColors = new Set(keyframes.map((kf) => kf.baseColor));
    expect(uniqueBaseColors.size).toBeGreaterThanOrEqual(1);
  });

  it('zero beginOffset starts animation near the beginning', () => {
    const grid = makeGrid();
    const placed: PlacedTetromino = {
      piece: TETROMINOES[1], // O-piece (height 2)
      col: 10,
      rotation: 0,
      beginOffset: 0,
    };
    const keyframes = computeFallingAnimation(placed, 6.5, testPalette, grid);

    // The piece starts above the grid, so the first visible keyframe
    // is at stepFraction * 1 (when the bottom of the piece enters row 0).
    // totalPositions = 7 + 2 = 9, stepFraction = 1/(9+1) = 0.1
    const minStart = Math.min(...keyframes.map((kf) => kf.startTime));
    expect(minStart).toBeCloseTo(0.1, 4);
  });
});
