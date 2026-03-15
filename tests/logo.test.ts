import { describe, it, expect } from 'vitest';
import { placeLogo, isLogoCel, LOGOS } from '../src/logo.js';
import { buildGrid } from '../src/grid.js';
import { createSampleContributions } from './fixtures/sample-contributions.js';
import type { Grid, PlacedLogo } from '../src/types.js';

function makeGrid(cols: number): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cols; c++) {
    grid[c] = new Array(7).fill(null);
    for (let r = 0; r < 7; r++) {
      grid[c][r] = { x: c, y: r, date: '2024-01-01', count: 0, level: 0 as const };
    }
  }
  return grid;
}

describe('placeLogo', () => {
  const grid = makeGrid(53);

  it('returns null for "none"', () => {
    expect(placeLogo('none', 'top-right', grid)).toBeNull();
  });

  it('returns null for unknown logo name', () => {
    expect(placeLogo('nonexistent-logo', 'top-right', grid)).toBeNull();
  });

  it('top-right places at correct position', () => {
    const placed = placeLogo('microsoft', 'top-right', grid);
    expect(placed).not.toBeNull();
    expect(placed!.col).toBe(53 - LOGOS.microsoft.width); // 51
    expect(placed!.row).toBe(0);
  });

  it('top-left places at (0, 0)', () => {
    const placed = placeLogo('microsoft', 'top-left', grid);
    expect(placed).not.toBeNull();
    expect(placed!.col).toBe(0);
    expect(placed!.row).toBe(0);
  });

  it('bottom-right places at correct position', () => {
    const placed = placeLogo('microsoft', 'bottom-right', grid);
    expect(placed).not.toBeNull();
    expect(placed!.col).toBe(53 - LOGOS.microsoft.width); // 51
    expect(placed!.row).toBe(7 - LOGOS.microsoft.height); // 5
  });

  it('bottom-left places at correct position', () => {
    const placed = placeLogo('microsoft', 'bottom-left', grid);
    expect(placed).not.toBeNull();
    expect(placed!.col).toBe(0);
    expect(placed!.row).toBe(7 - LOGOS.microsoft.height); // 5
  });

  it('returns the correct logo definition', () => {
    const placed = placeLogo('microsoft', 'top-right', grid);
    expect(placed).not.toBeNull();
    expect(placed!.logo.name).toBe('Microsoft');
    expect(placed!.logo.cells).toHaveLength(4);
  });
});

describe('isLogoCel', () => {
  it('returns color for logo cells', () => {
    const grid = makeGrid(53);
    const placed = placeLogo('microsoft', 'top-right', grid)!;
    // Microsoft logo at col=51, row=0: top-left cell is #F25022
    expect(isLogoCel(51, 0, placed)).toBe('#F25022');
    // top-right cell is #7FBA00
    expect(isLogoCel(52, 0, placed)).toBe('#7FBA00');
    // bottom-left cell is #00A4EF
    expect(isLogoCel(51, 1, placed)).toBe('#00A4EF');
    // bottom-right cell is #FFB900
    expect(isLogoCel(52, 1, placed)).toBe('#FFB900');
  });

  it('returns null for non-logo cells', () => {
    const grid = makeGrid(53);
    const placed = placeLogo('microsoft', 'top-right', grid)!;
    expect(isLogoCel(0, 0, placed)).toBeNull();
    expect(isLogoCel(50, 0, placed)).toBeNull();
    expect(isLogoCel(25, 3, placed)).toBeNull();
  });

  it('returns null when no logo is placed', () => {
    expect(isLogoCel(0, 0, null)).toBeNull();
    expect(isLogoCel(51, 0, null)).toBeNull();
  });
});
