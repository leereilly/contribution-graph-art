import { LogoDefinition, PlacedLogo, Grid } from './types.js';

export const LOGOS: Record<string, LogoDefinition> = {
  microsoft: {
    name: 'Microsoft',
    width: 2,
    height: 2,
    cells: [
      { relX: 0, relY: 0, color: '#F25022' },  // Red (top-left)
      { relX: 1, relY: 0, color: '#7FBA00' },  // Green (top-right)
      { relX: 0, relY: 1, color: '#00A4EF' },  // Blue (bottom-left)
      { relX: 1, relY: 1, color: '#FFB900' },  // Yellow (bottom-right)
    ],
  },
};

export type LogoPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * Place a logo on the grid at the specified position.
 * Returns null if the logo name is 'none' or unknown.
 */
export function placeLogo(
  logoName: string,
  position: LogoPosition,
  grid: Grid
): PlacedLogo | null {
  if (logoName === 'none' || !LOGOS[logoName]) {
    return null;
  }

  const logo = LOGOS[logoName];
  const numCols = grid.length;
  const numRows = 7;

  let col: number;
  let row: number;

  switch (position) {
    case 'top-right':
      col = numCols - logo.width;
      row = 0;
      break;
    case 'top-left':
      col = 0;
      row = 0;
      break;
    case 'bottom-right':
      col = numCols - logo.width;
      row = numRows - logo.height;
      break;
    case 'bottom-left':
      col = 0;
      row = numRows - logo.height;
      break;
  }

  return { logo, col, row };
}

/**
 * Check if a grid cell is occupied by a logo.
 */
export function isLogoCel(
  cellCol: number,
  cellRow: number,
  placedLogo: PlacedLogo | null
): string | null {
  if (!placedLogo) return null;

  for (const cell of placedLogo.logo.cells) {
    if (
      cellCol === placedLogo.col + cell.relX &&
      cellRow === placedLogo.row + cell.relY
    ) {
      return cell.color;
    }
  }

  return null;
}
