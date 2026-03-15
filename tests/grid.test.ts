import { describe, it, expect } from 'vitest';
import { buildGrid, gridCols, gridRows } from '../src/grid.js';
import { createSampleContributions, createSmallContributions } from './fixtures/sample-contributions.js';
import type { ContributionCell } from '../src/types.js';

describe('buildGrid', () => {
  it('creates correct dimensions for full 53×7 data', () => {
    const cells = createSampleContributions();
    const grid = buildGrid(cells);
    expect(grid.length).toBe(53);
    for (const col of grid) {
      expect(col.length).toBe(7);
    }
  });

  it('creates correct dimensions for small 5×7 data', () => {
    const cells = createSmallContributions();
    const grid = buildGrid(cells);
    expect(grid.length).toBe(5);
    for (const col of grid) {
      expect(col.length).toBe(7);
    }
  });

  it('handles empty input', () => {
    const grid = buildGrid([]);
    // With no cells, maxWeek is -Infinity via reduce with initial 0, so numCols = 1
    // Actually: reduce with empty array and no initial value throws, but
    // cells.reduce((max, c) => ..., 0) returns 0 for empty → numCols = 1
    expect(grid.length).toBe(1);
    expect(grid[0].length).toBe(7);
    // All cells should be null
    for (const cell of grid[0]) {
      expect(cell).toBeNull();
    }
  });

  it('places cells at correct positions', () => {
    const cells: ContributionCell[] = [
      { x: 0, y: 0, date: '2024-01-01', count: 5, level: 2 },
      { x: 2, y: 3, date: '2024-01-17', count: 10, level: 4 },
    ];
    const grid = buildGrid(cells);
    expect(grid[0][0]).toEqual(cells[0]);
    expect(grid[2][3]).toEqual(cells[1]);
  });

  it('sparse data leaves missing cells as null', () => {
    const cells: ContributionCell[] = [
      { x: 0, y: 0, date: '2024-01-01', count: 1, level: 1 },
      { x: 4, y: 6, date: '2024-02-01', count: 2, level: 2 },
    ];
    const grid = buildGrid(cells);
    expect(grid.length).toBe(5); // columns 0-4
    // Column 1 should be all nulls
    for (let r = 0; r < 7; r++) {
      expect(grid[1][r]).toBeNull();
    }
    // Column 0 row 1 should be null
    expect(grid[0][1]).toBeNull();
    // Placed cells should exist
    expect(grid[0][0]).not.toBeNull();
    expect(grid[4][6]).not.toBeNull();
  });

  it('ignores cells with out-of-range y values', () => {
    const cells: ContributionCell[] = [
      { x: 0, y: 0, date: '2024-01-01', count: 1, level: 1 },
      { x: 0, y: 7, date: '2024-01-01', count: 1, level: 1 }, // y=7 is out of bounds
      { x: 0, y: -1, date: '2024-01-01', count: 1, level: 1 }, // y=-1 is out of bounds
    ];
    const grid = buildGrid(cells);
    expect(grid[0][0]).not.toBeNull();
    // Only the valid cell should be placed
    const nonNull = grid[0].filter((c) => c !== null);
    expect(nonNull.length).toBe(1);
  });
});

describe('gridCols', () => {
  it('returns correct column count', () => {
    const cells = createSampleContributions();
    const grid = buildGrid(cells);
    expect(gridCols(grid)).toBe(53);
  });

  it('returns correct column count for small grid', () => {
    const cells = createSmallContributions();
    const grid = buildGrid(cells);
    expect(gridCols(grid)).toBe(5);
  });
});

describe('gridRows', () => {
  it('always returns 7', () => {
    expect(gridRows()).toBe(7);
  });
});
