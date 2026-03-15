import { describe, it, expect } from 'vitest';
import { buildGrid } from '../src/grid.js';
import { placeLogo } from '../src/logo.js';
import { generateTetrominoes } from '../src/tetromino.js';
import { computeFallingAnimation } from '../src/animator.js';
import { computeSnakeAnimation } from '../src/snake.js';
import { renderSvg } from '../src/svg-renderer.js';
import { GITHUB_LIGHT, GITHUB_DARK } from '../src/palettes.js';
import { createSampleContributions, createSmallContributions } from './fixtures/sample-contributions.js';
import type { RenderOptions, AnimationKeyframe, AnimationMode } from '../src/types.js';

const CELL_SIZE = 11;
const CELL_GAP = 3;
const ANIMATION_DURATION = 6;
const STAGGER_INTERVAL = 1.5;

function runPipeline(opts: {
  contributions?: ReturnType<typeof createSampleContributions>;
  logo?: string;
  tetrominoCount?: number;
  darkPalette?: typeof GITHUB_DARK;
  animationMode?: AnimationMode;
  foodCount?: number;
}) {
  const cells = opts.contributions ?? createSampleContributions();
  const grid = buildGrid(cells);
  const numCols = grid.length;
  const placedLogo = placeLogo(opts.logo ?? 'microsoft', 'top-right', grid);

  let allAnimations: AnimationKeyframe[];
  let effectiveDuration = ANIMATION_DURATION;

  if (opts.animationMode === 'snake') {
    const result = computeSnakeAnimation(grid, GITHUB_LIGHT, placedLogo, {
      foodCount: opts.foodCount ?? 5,
    });
    allAnimations = result.keyframes;
    effectiveDuration = result.duration;
  } else {
    const tetrominoes = generateTetrominoes(
      opts.tetrominoCount ?? 3,
      numCols,
      STAGGER_INTERVAL,
      placedLogo,
    );
    allAnimations = [];
    for (const t of tetrominoes) {
      allAnimations.push(...computeFallingAnimation(t, ANIMATION_DURATION, GITHUB_LIGHT, grid));
    }
  }

  const renderOpts: RenderOptions = {
    palette: GITHUB_LIGHT,
    darkPalette: opts.darkPalette,
    animationDuration: effectiveDuration,
    width: numCols * (CELL_SIZE + CELL_GAP) - CELL_GAP,
    height: 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP,
    cellSize: CELL_SIZE,
    cellGap: CELL_GAP,
  };
  const svg = renderSvg(grid, allAnimations, placedLogo, renderOpts);
  return { svg, grid, allAnimations, placedLogo };
}

describe('Integration: full pipeline', () => {
  it('produces valid SVG with 53×7 grid, 3 tetrominoes, and microsoft logo', () => {
    const { svg } = runPipeline({});

    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);

    const rectCount = (svg.match(/<rect /g) || []).length;
    expect(rectCount).toBe(371); // 53 × 7

    expect(svg).toContain('<animate');

    // Microsoft logo colors
    expect(svg).toContain('#F25022');
    expect(svg).toContain('#7FBA00');
    expect(svg).toContain('#00A4EF');
    expect(svg).toContain('#FFB900');

    // SVG dimensions: 53 cols × 14 pitch - 3 gap = 739, 7 rows × 14 pitch - 3 gap = 95
    expect(svg).toContain('width="739"');
    expect(svg).toContain('height="95"');
  });

  it('produces dark mode SVG with CSS variables', () => {
    const { svg } = runPipeline({ darkPalette: GITHUB_DARK });

    expect(svg).toContain('<style>');
    expect(svg).toContain('@media (prefers-color-scheme: dark)');

    // Light palette CSS vars
    expect(svg).toContain(`--c0: ${GITHUB_LIGHT.colors[0]}`);
    // Dark palette CSS vars
    expect(svg).toContain(`--c0: ${GITHUB_DARK.colors[0]}`);

    // Static cells use CSS variable fills
    expect(svg).toContain('var(--c0)');
  });

  it('produces SVG with no animations when tetromino count is 0', () => {
    const { svg } = runPipeline({ tetrominoCount: 0 });

    expect(svg).not.toContain('<animate');

    // Still has logo colors
    expect(svg).toContain('#F25022');
    expect(svg).toContain('#7FBA00');

    // Grid is intact
    const rectCount = (svg.match(/<rect /g) || []).length;
    expect(rectCount).toBe(371);
  });

  it('produces SVG without Microsoft brand colors when logo is none', () => {
    const { svg } = runPipeline({ logo: 'none' });

    expect(svg).not.toContain('#F25022');
    expect(svg).not.toContain('#7FBA00');
    expect(svg).not.toContain('#00A4EF');
    expect(svg).not.toContain('#FFB900');

    // Tetrominoes still produce animations
    expect(svg).toContain('<animate');
  });

  it('staggers animation begin offsets for multiple tetrominoes', () => {
    const { svg } = runPipeline({});

    // First tetromino: begin="0s" (may be omitted since beginOffset === 0)
    // Second tetromino: begin="1.5s"
    // Third tetromino: begin="3s"
    expect(svg).toContain('begin="1.5s"');
    expect(svg).toContain('begin="3s"');
  });

  it('renders small grid correctly', () => {
    const { svg } = runPipeline({ contributions: createSmallContributions(), tetrominoCount: 1, logo: 'none' });

    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);

    // 5 cols × 14 pitch - 3 gap = 67, 7 rows × 14 pitch - 3 gap = 95
    expect(svg).toContain('width="67"');
    expect(svg).toContain('height="95"');

    const rectCount = (svg.match(/<rect /g) || []).length;
    expect(rectCount).toBe(35); // 5 × 7
  });
});

describe('Integration: SVG validity', () => {
  it('keyTimes values are monotonically increasing', () => {
    const { svg } = runPipeline({});
    const keyTimesMatches = svg.matchAll(/keyTimes="([^"]+)"/g);

    let count = 0;
    for (const match of keyTimesMatches) {
      const times = match[1].split(';').map(Number);
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
      count++;
    }
    expect(count).toBeGreaterThan(0);
  });

  it('keyTimes count matches values count in each animate element', () => {
    const { svg } = runPipeline({});
    const animateRegex = /keyTimes="([^"]+)"[^>]*values="([^"]+)"/g;

    let count = 0;
    for (const match of svg.matchAll(animateRegex)) {
      const keyTimesCount = match[1].split(';').length;
      const valuesCount = match[2].split(';').length;
      expect(keyTimesCount).toBe(valuesCount);
      count++;
    }
    expect(count).toBeGreaterThan(0);
  });

  it('all animate elements have correct attributes', () => {
    const { svg } = runPipeline({});
    const animateElements = svg.match(/<animate [^/]*\/>/g) || svg.match(/<animate [^>]*>/g) || [];

    expect(animateElements.length).toBeGreaterThan(0);
    for (const el of animateElements) {
      expect(el).toContain('calcMode="discrete"');
      expect(el).toContain('repeatCount="1"');
      expect(el).toContain('fill="freeze"');
    }
  });
});

describe('Integration: snake mode', () => {
  it('produces valid SVG with animate elements, food color, and snake color', () => {
    const { svg } = runPipeline({ animationMode: 'snake', logo: 'none', foodCount: 5 });

    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);

    const rectCount = (svg.match(/<rect /g) || []).length;
    expect(rectCount).toBe(371); // 53 × 7

    expect(svg).toContain('<animate');

    // Food color (red) and snake body color (black) must be present
    expect(svg).toContain('#FF0000');
    expect(svg).toContain('#000000');

    // Snake uses beginOffset=0 so no staggered begin attributes
    const beginMatches = svg.match(/begin="[^"]+"/g) || [];
    for (const b of beginMatches) {
      expect(b).toBe('begin="0s"');
    }
  });

  it('produces valid SVG with snake and logo', () => {
    const { svg } = runPipeline({ animationMode: 'snake', logo: 'microsoft', foodCount: 3 });

    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain('<animate');

    // Microsoft logo colors present
    expect(svg).toContain('#F25022');
    expect(svg).toContain('#7FBA00');

    // Snake food and body colors present
    expect(svg).toContain('#FF0000');
    expect(svg).toContain('#000000');
  });

  it('works with 1 food cell', () => {
    const { svg } = runPipeline({ animationMode: 'snake', logo: 'none', foodCount: 1 });
    expect(svg).toContain('<animate');
    expect(svg).toContain('#FF0000');
  });

  it('works with 15 food cells', () => {
    const { svg } = runPipeline({ animationMode: 'snake', logo: 'none', foodCount: 15 });
    expect(svg).toContain('<animate');
    expect(svg).toContain('#FF0000');
  });
});
