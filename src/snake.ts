import {
  Grid,
  Palette,
  PlacedLogo,
  AnimationKeyframe,
  SnakeOptions,
  SnakeStep,
  GridPoint,
  FoodCell,
} from './types.js';
import { isLogoCel } from './logo.js';

const GRID_ROWS = 7;

// Classic arcade Snake: ~8 cells/second
export const SNAKE_STEP_INTERVAL = 0.125;
export const FOOD_COLOR = '#FF0000';
export const SNAKE_COLOR = '#000000';

export const DEFAULT_SNAKE_OPTIONS: SnakeOptions = {
  initialLength: 4,
  maxSteps: 300,
  wrap: false,
  foodCount: 5,
};

export interface SnakePathResult {
  path: SnakeStep[];
  bodyByStep: GridPoint[][];
  foodCells: FoodCell[];
}

function manhattan(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isLogoCell(col: number, row: number, placedLogo: PlacedLogo | null): boolean {
  return isLogoCel(col, row, placedLogo) !== null;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Deterministic PRNG (linear congruential generator).
 * Returns a function that produces values in [0, 1).
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0 || 42;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

/**
 * Derive a deterministic seed from grid contribution data.
 */
function gridSeed(grid: Grid): number {
  let seed = 0;
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      const cell = grid[c]?.[r];
      if (cell) {
        seed = (seed * 31 + cell.count + c * 7 + r) | 0;
      }
    }
  }
  return seed || 42;
}

/**
 * Place food cells deterministically across the grid.
 * Spreads food into vertical bands for good spatial distribution.
 */
export function placeFoodCells(
  grid: Grid,
  placedLogo: PlacedLogo | null,
  foodCount: number,
): FoodCell[] {
  const numCols = grid.length;
  const rng = seededRandom(gridSeed(grid) + foodCount);

  // Collect valid cells (non-null, not logo, not column 0 where snake starts)
  const validCells: FoodCell[] = [];
  for (let c = 1; c < numCols; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (grid[c]?.[r] != null && !isLogoCell(c, r, placedLogo)) {
        validCells.push({ x: c, y: r });
      }
    }
  }

  if (validCells.length === 0) return [];
  const count = Math.min(foodCount, validCells.length);

  // Divide into bands and pick one cell per band
  const bandWidth = (numCols - 1) / count;
  const food: FoodCell[] = [];
  const usedKeys = new Set<string>();

  for (let i = 0; i < count; i++) {
    const bandStart = Math.floor(1 + i * bandWidth);
    const bandEnd = Math.floor(1 + (i + 1) * bandWidth);

    // Cells in this band
    const bandCells = validCells.filter(
      (c) => c.x >= bandStart && c.x < bandEnd && !usedKeys.has(key(c.x, c.y)),
    );

    if (bandCells.length > 0) {
      const idx = Math.floor(rng() * bandCells.length);
      const chosen = bandCells[idx];
      food.push(chosen);
      usedKeys.add(key(chosen.x, chosen.y));
    } else {
      // Fallback: pick any remaining valid cell
      const remaining = validCells.filter((c) => !usedKeys.has(key(c.x, c.y)));
      if (remaining.length > 0) {
        const idx = Math.floor(rng() * remaining.length);
        const chosen = remaining[idx];
        food.push(chosen);
        usedKeys.add(key(chosen.x, chosen.y));
      }
    }
  }

  return food;
}

/**
 * Compute the snake's path across the contribution grid.
 *
 * The snake targets red food cells, eats them (growing by 1 each),
 * then exits off the right edge of the grid.
 */
export function computeSnakePath(
  grid: Grid,
  placedLogo: PlacedLogo | null,
  options?: Partial<SnakeOptions>,
): SnakePathResult {
  const opts: SnakeOptions = { ...DEFAULT_SNAKE_OPTIONS, ...options };
  const numCols = grid.length;

  const foodCells = placeFoodCells(grid, placedLogo, opts.foodCount);
  const foodSet = new Set<string>(foodCells.map((f) => key(f.x, f.y)));
  const eaten = new Set<string>();

  // Find starting row — prefer row 3 (middle)
  const startRowCandidates = [3, 2, 4, 1, 5, 0, 6];
  let startRow = 3;
  for (const r of startRowCandidates) {
    if (!isLogoCell(0, r, placedLogo)) {
      startRow = r;
      break;
    }
  }

  const path: SnakeStep[] = [];
  const bodyByStep: GridPoint[][] = [];
  const body: GridPoint[] = [];
  const bodySet = new Set<string>();

  let headX = 0;
  let headY = startRow;
  let targetLength = opts.initialLength;
  let weaveDir = 1;
  let allFoodEaten = false;

  // Push initial head
  body.unshift({ x: headX, y: headY });
  bodySet.add(key(headX, headY));

  const ate0 = foodSet.has(key(headX, headY)) && !eaten.has(key(headX, headY));
  if (ate0) {
    eaten.add(key(headX, headY));
    targetLength++;
  }
  allFoodEaten = eaten.size >= foodCells.length;
  path.push({ x: headX, y: headY, ate: ate0 });
  bodyByStep.push([...body]);

  let consecutiveRight = 0;

  for (let step = 1; step < opts.maxSteps; step++) {
    // Exit condition: all food eaten and entire body is off-screen
    if (allFoodEaten && headX >= numCols) {
      const allOffScreen = body.every((b) => b.x >= numCols);
      if (allOffScreen) break;
    }

    // Find target: leftmost uneaten food ahead, or exit point.
    // Targeting leftmost ensures the snake visits food in order and never skips any.
    let target: GridPoint | null = null;

    if (!allFoodEaten) {
      let bestX = Infinity;
      let bestY = Infinity;
      for (const f of foodCells) {
        if (eaten.has(key(f.x, f.y))) continue;
        if (f.x < headX) continue; // unreachable — already passed
        if (f.x < bestX || (f.x === bestX && f.y < bestY)) {
          bestX = f.x;
          bestY = f.y;
          target = { x: f.x, y: f.y };
        }
      }
      if (!target) {
        allFoodEaten = true;
        target = { x: numCols + targetLength, y: headY };
      }
    } else {
      target = { x: numCols + targetLength, y: headY };
    }

    // Generate candidate moves: RIGHT, vertical-in-weaveDir, vertical-opposite
    const candidates: GridPoint[] = [];
    candidates.push({ x: headX + 1, y: headY });
    candidates.push({ x: headX, y: headY + weaveDir });
    candidates.push({ x: headX, y: headY - weaveDir });

    const willRemoveTail = body.length >= targetLength;
    const tailKey = willRemoveTail ? key(body[body.length - 1].x, body[body.length - 1].y) : null;

    // Filter valid candidates — allow off-screen right during exit phase
    const validCandidates = candidates.filter((c) => {
      const cx = c.x;
      const cy = c.y;

      // Allow moving off right edge when exiting
      if (cx >= numCols) {
        if (!allFoodEaten) return false;
        if (cy < 0 || cy >= GRID_ROWS) return false;
        const ck = key(cx, cy);
        if (bodySet.has(ck) && ck !== tailKey) return false;
        return true;
      }

      if (cx < 0 || cy < 0 || cy >= GRID_ROWS) return false;
      if (isLogoCell(cx, cy, placedLogo)) return false;

      const ck = key(cx, cy);
      if (bodySet.has(ck) && ck !== tailKey) return false;

      return true;
    });

    if (validCandidates.length === 0) break;

    // After 2 consecutive RIGHT moves, prefer vertical for zig-zag
    let scoringCandidates = validCandidates;
    if (!allFoodEaten && consecutiveRight >= 2) {
      const verticalOnly = validCandidates.filter((c) => c.x === headX);
      if (verticalOnly.length > 0) {
        scoringCandidates = verticalOnly;
      }
    }

    // Score candidates by distance to target
    let chosen: GridPoint;
    if (target) {
      let bestScore = Infinity;
      chosen = scoringCandidates[0];
      for (const c of scoringCandidates) {
        const score = manhattan(c, target);
        if (score < bestScore) {
          bestScore = score;
          chosen = c;
        } else if (score === bestScore) {
          const chosenIsRight = chosen.x > headX;
          const cIsRight = c.x > headX;
          if (cIsRight && !chosenIsRight) {
            chosen = c;
          } else if (cIsRight === chosenIsRight) {
            const chosenIsWeave = chosen.y === headY + weaveDir;
            const cIsWeave = c.y === headY + weaveDir;
            if (cIsWeave && !chosenIsWeave) {
              chosen = c;
            }
          }
        }
      }
    } else {
      chosen = scoringCandidates[0];
    }

    if (chosen.x !== headX) {
      weaveDir = -weaveDir;
    }

    if (chosen.x > headX) {
      consecutiveRight++;
    } else {
      consecutiveRight = 0;
    }

    headX = chosen.x;
    headY = chosen.y;

    // Check eating
    const ate = foodSet.has(key(headX, headY)) && !eaten.has(key(headX, headY));
    if (ate) {
      eaten.add(key(headX, headY));
      targetLength++;
      if (eaten.size >= foodCells.length) allFoodEaten = true;
    }

    // Body management
    body.unshift({ x: headX, y: headY });
    bodySet.add(key(headX, headY));
    if (body.length > targetLength) {
      const removed = body.pop()!;
      bodySet.delete(key(removed.x, removed.y));
    }

    path.push({ x: headX, y: headY, ate });
    bodyByStep.push([...body]);
  }

  return { path, bodyByStep, foodCells };
}

/**
 * Generate animation keyframes for the snake animation mode.
 *
 * Returns keyframes and a computed duration based on classic arcade speed.
 * Food cells appear red from the start; the snake body is bright green;
 * cells revert to their contribution color after the snake passes.
 */
export function computeSnakeAnimation(
  grid: Grid,
  palette: Palette,
  placedLogo: PlacedLogo | null,
  options?: Partial<SnakeOptions>,
): { keyframes: AnimationKeyframe[]; duration: number } {
  const { path, bodyByStep, foodCells } = computeSnakePath(grid, placedLogo, options);
  const totalSteps = bodyByStep.length;
  const numCols = grid.length;
  const keyframes: AnimationKeyframe[] = [];

  if (totalSteps === 0) return { keyframes: [], duration: 0 };

  // Duration derived from step count at classic arcade speed
  const duration = totalSteps * SNAKE_STEP_INTERVAL;

  const foodSet = new Set<string>(foodCells.map((f) => key(f.x, f.y)));

  // Find the step when each food cell is eaten
  const foodEatStep = new Map<string, number>();
  for (let i = 0; i < path.length; i++) {
    if (path[i].ate) {
      foodEatStep.set(key(path[i].x, path[i].y), i);
    }
  }

  // Build per-cell occupancy ranges from bodyByStep
  // Map: cell_key -> [enterStep, exitStep][]
  const cellOccupancy = new Map<string, { enter: number; exit: number }[]>();
  for (let step = 0; step < totalSteps; step++) {
    for (const seg of bodyByStep[step]) {
      // Skip off-screen segments
      if (seg.x < 0 || seg.x >= numCols) continue;
      if (seg.y < 0 || seg.y >= GRID_ROWS) continue;
      if (isLogoCell(seg.x, seg.y, placedLogo)) continue;

      const k = key(seg.x, seg.y);
      const ranges = cellOccupancy.get(k);
      if (ranges) {
        const lastRange = ranges[ranges.length - 1];
        if (lastRange.exit === step) {
          lastRange.exit = step + 1;
        } else {
          ranges.push({ enter: step, exit: step + 1 });
        }
      } else {
        cellOccupancy.set(k, [{ enter: step, exit: step + 1 }]);
      }
    }
  }

  // Generate food keyframes: red from t=0 until eaten
  for (const f of foodCells) {
    const k = key(f.x, f.y);
    const eatStep = foodEatStep.get(k);
    const cell = grid[f.x]?.[f.y];
    const baseColor = cell ? palette.colors[cell.level] : palette.colors[0];

    const endFrac = eatStep != null ? eatStep / totalSteps : 1;
    // Use a tiny start offset so base → red transition is captured
    const startFrac = 0.0001;

    if (endFrac > startFrac) {
      keyframes.push({
        cellX: f.x,
        cellY: f.y,
        startTime: startFrac,
        endTime: endFrac,
        baseColor,
        highlightColor: FOOD_COLOR,
        beginOffset: 0,
      });
    }
  }

  // Generate snake body keyframes
  for (const [k, ranges] of cellOccupancy) {
    const [cx, cy] = k.split(',').map(Number);
    const cell = grid[cx]?.[cy];
    const baseColor = cell ? palette.colors[cell.level] : palette.colors[0];

    for (const range of ranges) {
      const startFrac = range.enter / totalSteps;
      const endFrac = Math.min(range.exit / totalSteps, 1);

      if (endFrac > startFrac) {
        keyframes.push({
          cellX: cx,
          cellY: cy,
          startTime: startFrac,
          endTime: endFrac,
          baseColor,
          highlightColor: SNAKE_COLOR,
          beginOffset: 0,
        });
      }
    }
  }

  return { keyframes, duration };
}
