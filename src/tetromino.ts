import { TetrominoPiece, PlacedTetromino, PlacedLogo } from './types.js';

export const TETROMINOES: TetrominoPiece[] = [
  { name: 'I', shape: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: 'O', shape: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: 'T', shape: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { name: 'S', shape: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: 'Z', shape: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { name: 'L', shape: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { name: 'J', shape: [[2, 0], [0, 1], [1, 1], [2, 1]] },
];

/**
 * Rotate a piece shape 90° clockwise.
 * (x, y) → (maxY - y, x), then normalize to origin.
 */
export function rotateShape(shape: [number, number][]): [number, number][] {
  const maxY = Math.max(...shape.map(([, y]) => y));
  const rotated = shape.map(([x, y]): [number, number] => [maxY - y, x]);

  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));
  return rotated.map(([x, y]): [number, number] => [x - minX, y - minY]);
}

/**
 * Get the shape of a piece at a given rotation (0–3).
 */
export function getRotatedShape(
  piece: TetrominoPiece,
  rotation: number,
): [number, number][] {
  let shape = piece.shape;
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    shape = rotateShape(shape);
  }
  return shape;
}

export function shapeWidth(shape: [number, number][]): number {
  return Math.max(...shape.map(([x]) => x)) + 1;
}

export function shapeHeight(shape: [number, number][]): number {
  return Math.max(...shape.map(([, y]) => y)) + 1;
}

/**
 * Check if placing a piece at a given column would overlap with
 * a placed logo or go out of grid bounds.
 */
export function canPlace(
  shape: [number, number][],
  col: number,
  gridCols: number,
  placedLogo: PlacedLogo | null,
): boolean {
  // Column bounds check
  for (const [dx] of shape) {
    const absCol = col + dx;
    if (absCol < 0 || absCol >= gridCols) return false;
  }

  // Logo overlap: piece falls through all rows, so any shared column means overlap
  if (placedLogo) {
    const pieceCols = new Set(shape.map(([dx]) => col + dx));
    for (const cell of placedLogo.logo.cells) {
      if (pieceCols.has(placedLogo.col + cell.relX)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Generate N randomly placed tetrominoes that don't overlap with each other
 * or the logo. Pieces are spread across the grid columns.
 */
export function generateTetrominoes(
  count: number,
  gridCols: number,
  staggerInterval: number,
  placedLogo: PlacedLogo | null,
): PlacedTetromino[] {
  if (count <= 0) return [];

  const result: PlacedTetromino[] = [];
  const segmentWidth = Math.floor(gridCols / count);

  for (let i = 0; i < count; i++) {
    const segStart = i * segmentWidth;
    const segEnd = i + 1 === count ? gridCols : (i + 1) * segmentWidth;

    // Deterministic piece and rotation selection
    const pieceIdx = (i * 3 + 1) % TETROMINOES.length;
    const piece = TETROMINOES[pieceIdx];
    const rotation = (i * 7 + 2) % 4;
    const shape = getRotatedShape(piece, rotation);
    const w = shapeWidth(shape);

    // Try placing at the centre of the segment, then fan outward
    const midCol = segStart + Math.floor((segEnd - segStart - w) / 2);
    let placed = false;

    for (let delta = 0; delta <= segEnd - segStart && !placed; delta++) {
      for (const dir of [0, -1, 1]) {
        const col = midCol + delta * dir;
        if (col < segStart || col + w > segEnd) continue;
        if (canPlace(shape, col, gridCols, placedLogo)) {
          result.push({
            piece,
            col,
            rotation,
            beginOffset: i * staggerInterval,
          });
          placed = true;
          break;
        }
      }
    }
  }

  return result;
}
