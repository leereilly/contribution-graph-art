import { AnimationKeyframe, PlacedTetromino, Grid, Palette } from './types.js';
import { getRotatedShape, shapeHeight } from './tetromino.js';

const GRID_ROWS = 7;

/**
 * Compute the falling animation keyframes for a single placed tetromino.
 *
 * The piece falls from above the grid (bottom of piece at row −1)
 * down through each row until it exits below the grid (row 6).
 */
export function computeFallingAnimation(
  placed: PlacedTetromino,
  totalDuration: number,
  palette: Palette,
  grid: Grid,
): AnimationKeyframe[] {
  const shape = getRotatedShape(placed.piece, placed.rotation);
  const h = shapeHeight(shape);
  const gridColCount = grid.length;

  // yPos ranges from -h (bottom of piece at row -1) to 6
  const totalPositions = GRID_ROWS + h;

  // Each piece gets the full duration for its fall, staggered via SVG begin attribute
  const stepFraction = 1.0 / (totalPositions + 1);

  const keyframes: AnimationKeyframe[] = [];

  for (let i = 0; i < totalPositions; i++) {
    const yPos = -h + i;
    const startTime = i * stepFraction;
    const endTime = startTime + stepFraction;

    for (const [dx, dy] of shape) {
      const cellX = placed.col + dx;
      const cellY = yPos + dy;

      if (cellX < 0 || cellX >= gridColCount) continue;
      if (cellY < 0 || cellY >= GRID_ROWS) continue;

      const cell = grid[cellX]?.[cellY];
      const baseColor = cell ? palette.colors[cell.level] : palette.colors[0];
      const highlightColor = palette.colors[4];

      keyframes.push({ cellX, cellY, startTime, endTime, baseColor, highlightColor, beginOffset: placed.beginOffset });
    }
  }

  return keyframes;
}
