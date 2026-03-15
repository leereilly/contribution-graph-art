import { describe, it, expect } from 'vitest';
import {
  computeSnakePath,
  computeSnakeAnimation,
  placeFoodCells,
  DEFAULT_SNAKE_OPTIONS,
  FOOD_COLOR,
  SNAKE_COLOR,
  SNAKE_STEP_INTERVAL,
} from '../src/snake.js';
import type { Grid, Palette, ContributionCell, PlacedLogo, LogoDefinition } from '../src/types.js';

function makeGrid(cols = 53): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cols; c++) {
    grid[c] = [];
    for (let r = 0; r < 7; r++) {
      grid[c][r] = {
        x: c,
        y: r,
        date: '2024-01-01',
        count: c + r,
        level: ((c + r) % 5) as 0 | 1 | 2 | 3 | 4,
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

describe('placeFoodCells', () => {
  it('places the requested number of food cells', () => {
    const grid = makeGrid(53);
    const food = placeFoodCells(grid, null, 5);
    expect(food.length).toBe(5);
  });

  it('places food deterministically — same grid gives same result', () => {
    const grid = makeGrid(53);
    const food1 = placeFoodCells(grid, null, 5);
    const food2 = placeFoodCells(grid, null, 5);
    expect(food1).toEqual(food2);
  });

  it('does not place food at column 0 (snake start)', () => {
    const grid = makeGrid(20);
    const food = placeFoodCells(grid, null, 10);
    for (const f of food) {
      expect(f.x).toBeGreaterThan(0);
    }
  });

  it('avoids logo cells', () => {
    const grid = makeGrid(20);
    const placedLogo: PlacedLogo = { logo: msLogo, col: 18, row: 0 };
    const food = placeFoodCells(grid, placedLogo, 10);
    const logoCells = [
      [18, 0], [19, 0], [18, 1], [19, 1],
    ];
    for (const f of food) {
      for (const [lx, ly] of logoCells) {
        expect(f.x === lx && f.y === ly).toBe(false);
      }
    }
  });

  it('caps at available cells for very small grids', () => {
    const grid = makeGrid(3); // only cols 1–2 valid (col 0 excluded), 14 cells
    const food = placeFoodCells(grid, null, 15);
    expect(food.length).toBeLessThanOrEqual(14);
    expect(food.length).toBeGreaterThan(0);
  });

  it('supports 1 food cell', () => {
    const grid = makeGrid(53);
    const food = placeFoodCells(grid, null, 1);
    expect(food.length).toBe(1);
  });

  it('supports 15 food cells', () => {
    const grid = makeGrid(53);
    const food = placeFoodCells(grid, null, 15);
    expect(food.length).toBe(15);
  });

  it('spreads food across the grid width', () => {
    const grid = makeGrid(53);
    const food = placeFoodCells(grid, null, 5);
    const xs = food.map((f) => f.x).sort((a, b) => a - b);
    // First food should be in first ~20% of grid, last in last ~20%
    expect(xs[0]).toBeLessThan(15);
    expect(xs[xs.length - 1]).toBeGreaterThan(40);
  });
});

describe('computeSnakePath', () => {
  it('is deterministic — same grid produces identical path twice', () => {
    const grid = makeGrid(20);
    const result1 = computeSnakePath(grid, null, { foodCount: 3 });
    const result2 = computeSnakePath(grid, null, { foodCount: 3 });
    expect(result1.path).toEqual(result2.path);
    expect(result1.bodyByStep).toEqual(result2.bodyByStep);
    expect(result1.foodCells).toEqual(result2.foodCells);
  });

  it('starts at (0, 3)', () => {
    const grid = makeGrid(20);
    const { path } = computeSnakePath(grid, null);
    expect(path[0].x).toBe(0);
    expect(path[0].y).toBe(3);
  });

  it('has body length equal to initialLength after enough steps', () => {
    const grid = makeGrid(20);
    const { bodyByStep } = computeSnakePath(grid, null, { initialLength: 4, foodCount: 1 });
    expect(bodyByStep[3].length).toBe(4);
  });

  it('eats all food cells and grows', () => {
    const grid = makeGrid(30);
    const { path, foodCells } = computeSnakePath(grid, null, { foodCount: 3 });

    let eatCount = 0;
    for (const step of path) {
      if (step.ate) eatCount++;
    }
    expect(eatCount).toBe(foodCells.length);
  });

  it('exits the right edge after eating all food', () => {
    const grid = makeGrid(20);
    const { path } = computeSnakePath(grid, null, { foodCount: 2 });

    // Last few steps should have x >= numCols (off-screen right)
    const lastStep = path[path.length - 1];
    expect(lastStep.x).toBeGreaterThanOrEqual(20);
  });

  it('avoids logo cells', () => {
    const grid = makeGrid(20);
    const placedLogo: PlacedLogo = { logo: msLogo, col: 2, row: 3 };
    const { path } = computeSnakePath(grid, placedLogo, { foodCount: 3 });
    const logoCells = [
      [2, 3], [3, 3], [2, 4], [3, 4],
    ];
    for (const step of path) {
      if (step.x >= 20) continue; // off-screen is fine
      for (const [lx, ly] of logoCells) {
        expect(step.x === lx && step.y === ly).toBe(false);
      }
    }
  });

  it('weaves — y-coordinate changes over time', () => {
    const grid = makeGrid(20);
    const { path } = computeSnakePath(grid, null, { foodCount: 3 });
    const yValues = new Set(path.filter((s) => s.x < 20).map((s) => s.y));
    expect(yValues.size).toBeGreaterThan(1);
  });

  it('no body self-collision at any step', () => {
    const grid = makeGrid(30);
    const { bodyByStep } = computeSnakePath(grid, null, { foodCount: 5 });
    for (let i = 0; i < bodyByStep.length; i++) {
      const positions = new Set(bodyByStep[i].map((p) => `${p.x},${p.y}`));
      expect(positions.size).toBe(bodyByStep[i].length);
    }
  });

  it('returns placed food cells', () => {
    const grid = makeGrid(20);
    const { foodCells } = computeSnakePath(grid, null, { foodCount: 4 });
    expect(foodCells.length).toBe(4);
    for (const f of foodCells) {
      expect(f.x).toBeGreaterThan(0);
      expect(f.x).toBeLessThan(20);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeLessThan(7);
    }
  });
});

describe('computeSnakeAnimation', () => {
  it('returns keyframes and a duration based on step count', () => {
    const grid = makeGrid(20);
    const { keyframes, duration } = computeSnakeAnimation(grid, testPalette, null, { foodCount: 3 });
    expect(keyframes.length).toBeGreaterThan(0);
    expect(duration).toBeGreaterThan(0);
    // Duration should be a multiple of SNAKE_STEP_INTERVAL
    expect(duration % SNAKE_STEP_INTERVAL).toBeCloseTo(0, 5);
  });

  it('contains food keyframes with FOOD_COLOR', () => {
    const grid = makeGrid(20);
    const { keyframes } = computeSnakeAnimation(grid, testPalette, null, { foodCount: 3 });
    const foodKeyframes = keyframes.filter((kf) => kf.highlightColor === FOOD_COLOR);
    expect(foodKeyframes.length).toBeGreaterThan(0);
  });

  it('contains snake body keyframes with SNAKE_COLOR', () => {
    const grid = makeGrid(20);
    const { keyframes } = computeSnakeAnimation(grid, testPalette, null, { foodCount: 3 });
    const snakeKeyframes = keyframes.filter((kf) => kf.highlightColor === SNAKE_COLOR);
    expect(snakeKeyframes.length).toBeGreaterThan(0);
  });

  it('all keyframes have beginOffset=0 and valid times', () => {
    const grid = makeGrid(20);
    const { keyframes } = computeSnakeAnimation(grid, testPalette, null, { foodCount: 3 });
    for (const kf of keyframes) {
      expect(kf.beginOffset).toBe(0);
      expect(kf.startTime).toBeGreaterThanOrEqual(0);
      expect(kf.endTime).toBeGreaterThan(kf.startTime);
      expect(kf.endTime).toBeLessThanOrEqual(1);
    }
  });

  it('produces no keyframes on logo cells', () => {
    const grid = makeGrid(20);
    const placedLogo: PlacedLogo = { logo: msLogo, col: 18, row: 0 };
    const { keyframes } = computeSnakeAnimation(grid, testPalette, placedLogo, { foodCount: 3 });
    const logoCells = [
      [18, 0], [19, 0], [18, 1], [19, 1],
    ];
    for (const kf of keyframes) {
      for (const [lx, ly] of logoCells) {
        expect(kf.cellX === lx && kf.cellY === ly).toBe(false);
      }
    }
  });

  it('food keyframes start near t=0', () => {
    const grid = makeGrid(20);
    const { keyframes } = computeSnakeAnimation(grid, testPalette, null, { foodCount: 3 });
    const foodKeyframes = keyframes.filter((kf) => kf.highlightColor === FOOD_COLOR);
    for (const kf of foodKeyframes) {
      expect(kf.startTime).toBeLessThan(0.01);
    }
  });
});

describe('DEFAULT_SNAKE_OPTIONS', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_SNAKE_OPTIONS.initialLength).toBe(4);
    expect(DEFAULT_SNAKE_OPTIONS.maxSteps).toBe(300);
    expect(DEFAULT_SNAKE_OPTIONS.wrap).toBe(false);
    expect(DEFAULT_SNAKE_OPTIONS.foodCount).toBe(5);
  });
});
