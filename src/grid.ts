import { ContributionCell, Grid } from './types.js';

/**
 * Build a grid from contribution cells.
 * Grid is [col][row] where col = week index, row = weekday.
 * Missing cells are null.
 */
export function buildGrid(cells: ContributionCell[]): Grid {
  // Find the number of weeks
  const maxWeek = cells.reduce((max, c) => Math.max(max, c.x), 0);
  const numCols = maxWeek + 1;

  // Initialize grid with nulls
  const grid: Grid = [];
  for (let col = 0; col < numCols; col++) {
    grid[col] = new Array(7).fill(null);
  }

  // Place cells
  for (const cell of cells) {
    if (cell.x >= 0 && cell.x < numCols && cell.y >= 0 && cell.y < 7) {
      grid[cell.x][cell.y] = cell;
    }
  }

  return grid;
}

/**
 * Get the number of columns in a grid.
 */
export function gridCols(grid: Grid): number {
  return grid.length;
}

/**
 * Get the number of rows in a grid (always 7).
 */
export function gridRows(): number {
  return 7;
}
