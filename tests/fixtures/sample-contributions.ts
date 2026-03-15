import { ContributionCell } from '../../src/types.js';

/**
 * Generate sample contribution data for testing.
 * Creates a full 53-week × 7-day grid with varied contribution levels.
 */
export function createSampleContributions(): ContributionCell[] {
  const cells: ContributionCell[] = [];
  for (let week = 0; week < 53; week++) {
    for (let day = 0; day < 7; day++) {
      const level = ((week + day) % 5) as 0 | 1 | 2 | 3 | 4;
      cells.push({
        x: week,
        y: day,
        date: `2024-01-${String((week * 7 + day) % 28 + 1).padStart(2, '0')}`,
        count: level * 3,
        level,
      });
    }
  }
  return cells;
}

/**
 * Create a small grid (5 columns) for focused testing.
 */
export function createSmallContributions(): ContributionCell[] {
  const cells: ContributionCell[] = [];
  for (let week = 0; week < 5; week++) {
    for (let day = 0; day < 7; day++) {
      cells.push({
        x: week,
        y: day,
        date: `2024-01-${String(week * 7 + day + 1).padStart(2, '0')}`,
        count: week,
        level: Math.min(week, 4) as 0 | 1 | 2 | 3 | 4,
      });
    }
  }
  return cells;
}
