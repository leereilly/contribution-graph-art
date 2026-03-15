import { describe, it, expect } from 'vitest';
import { renderSvg, groupKeyframesByCell, buildAnimateAttributes } from '../src/svg-renderer.js';
import type { Grid, ContributionCell, AnimationKeyframe, PlacedLogo, Palette, RenderOptions } from '../src/types.js';

// --- Helpers ---

function makeCell(x: number, y: number, level: 0 | 1 | 2 | 3 | 4 = 0): ContributionCell {
  return { x, y, date: '2024-01-01', count: level, level };
}

function makeGrid(cols: number, rows: number, level: 0 | 1 | 2 | 3 | 4 = 0): Grid {
  const grid: Grid = [];
  for (let c = 0; c < cols; c++) {
    const col: (ContributionCell | null)[] = [];
    for (let r = 0; r < rows; r++) {
      col.push(makeCell(c, r, level));
    }
    grid.push(col);
  }
  return grid;
}

const lightPalette: Palette = {
  name: 'github',
  colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
};

const darkPalette: Palette = {
  name: 'github-dark',
  colors: ['#161b22', '#01311f', '#034525', '#0f6d31', '#00c647'],
};

function defaultOptions(overrides?: Partial<RenderOptions>): RenderOptions {
  return {
    palette: lightPalette,
    animationDuration: 6.5,
    width: 739,
    height: 95,
    cellSize: 11,
    cellGap: 3,
    ...overrides,
  };
}

// --- groupKeyframesByCell ---

describe('groupKeyframesByCell', () => {
  it('groups keyframes by cell position', () => {
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1, endTime: 0.2, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
      { cellX: 1, cellY: 1, startTime: 0.3, endTime: 0.4, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
      { cellX: 0, cellY: 0, startTime: 0.5, endTime: 0.6, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const map = groupKeyframesByCell(kfs);
    expect(map.size).toBe(2);
    expect(map.get('0,0')!.length).toBe(2);
    expect(map.get('1,1')!.length).toBe(1);
  });

  it('returns empty map for no keyframes', () => {
    const map = groupKeyframesByCell([]);
    expect(map.size).toBe(0);
  });
});

// --- buildAnimateAttributes ---

describe('buildAnimateAttributes', () => {
  it('builds correct attributes for single keyframe', () => {
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1538, endTime: 0.3077, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const result = buildAnimateAttributes(kfs, 0);
    expect(result).not.toBeNull();
    expect(result!.keyTimes).toBe('0.0000;0.1538;0.3077');
    expect(result!.values).toBe('#ebedf0;#216e39;#ebedf0');
    expect(result!.begin).toBe('0s');
  });

  it('builds correct attributes for multiple keyframes', () => {
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1, endTime: 0.2, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
      { cellX: 0, cellY: 0, startTime: 0.5, endTime: 0.6, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const result = buildAnimateAttributes(kfs, 0);
    expect(result).not.toBeNull();
    expect(result!.keyTimes).toBe('0.0000;0.1000;0.2000;0.5000;0.6000');
    expect(result!.values).toBe('#ebedf0;#216e39;#ebedf0;#216e39;#ebedf0');
  });

  it('sorts keyframes by startTime', () => {
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.5, endTime: 0.6, baseColor: '#ebedf0', highlightColor: '#40c463', beginOffset: 0 },
      { cellX: 0, cellY: 0, startTime: 0.1, endTime: 0.2, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const result = buildAnimateAttributes(kfs, 0);
    expect(result).not.toBeNull();
    // First highlight should be #216e39 (startTime 0.1), then #40c463 (startTime 0.5)
    expect(result!.values).toBe('#ebedf0;#216e39;#ebedf0;#40c463;#ebedf0');
  });

  it('sets begin offset for non-zero value', () => {
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1538, endTime: 0.3077, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const result = buildAnimateAttributes(kfs, 1.5);
    expect(result).not.toBeNull();
    expect(result!.begin).toBe('1.5s');
  });

  it('returns null for empty keyframes', () => {
    expect(buildAnimateAttributes([], 0)).toBeNull();
  });

  it('deduplicates consecutive entries at the same time', () => {
    // If endTime of first === startTime of second, the base→highlight transition merges
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1, endTime: 0.3, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
      { cellX: 0, cellY: 0, startTime: 0.3, endTime: 0.5, baseColor: '#ebedf0', highlightColor: '#40c463', beginOffset: 0 },
    ];
    const result = buildAnimateAttributes(kfs, 0);
    expect(result).not.toBeNull();
    // At time 0.3: endTime of first (base) and startTime of second (highlight) collide
    // The highlight should win (later entry)
    expect(result!.keyTimes).toBe('0.0000;0.1000;0.3000;0.5000');
    expect(result!.values).toBe('#ebedf0;#216e39;#40c463;#ebedf0');
  });
});

// --- renderSvg ---

describe('renderSvg', () => {
  it('renders correct SVG dimensions for small grid', () => {
    const grid = makeGrid(3, 7);
    const svg = renderSvg(grid, [], null, defaultOptions());
    expect(svg).toContain('width="39"');   // 3*14-3
    expect(svg).toContain('height="95"');  // 7*14-3
    expect(svg).toContain('viewBox="0 0 39 95"');
  });

  it('renders correct dimensions for 53-column grid', () => {
    const grid = makeGrid(53, 7);
    const svg = renderSvg(grid, [], null, defaultOptions());
    expect(svg).toContain('width="739"');
    expect(svg).toContain('height="95"');
  });

  it('renders static cells with palette colors', () => {
    const grid = makeGrid(2, 2, 0);
    grid[1][0] = makeCell(1, 0, 3);
    const svg = renderSvg(grid, [], null, defaultOptions());
    expect(svg).toContain('fill="#ebedf0"');
    expect(svg).toContain('fill="#30a14e"');
  });

  it('renders cells at correct positions', () => {
    const grid = makeGrid(3, 2);
    const svg = renderSvg(grid, [], null, defaultOptions());
    // col=0,row=0 → x=0,y=0
    expect(svg).toContain('x="0" y="0"');
    // col=1,row=0 → x=14,y=0
    expect(svg).toContain('x="14" y="0"');
    // col=2,row=1 → x=28,y=14
    expect(svg).toContain('x="28" y="14"');
  });

  it('includes animate element for animated cells', () => {
    const grid = makeGrid(3, 2);
    const kfs: AnimationKeyframe[] = [
      { cellX: 1, cellY: 0, startTime: 0.1538, endTime: 0.3077, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const svg = renderSvg(grid, kfs, null, defaultOptions());
    expect(svg).toContain('<animate');
    expect(svg).toContain('calcMode="discrete"');
    expect(svg).toContain('dur="6.5s"');
    expect(svg).toContain('repeatCount="1"');
    expect(svg).toContain('fill="freeze"');
    expect(svg).toContain('keyTimes="0.0000;0.1538;0.3077"');
    expect(svg).toContain('values="#ebedf0;#216e39;#ebedf0"');
  });

  it('renders logo cells with brand colors and no animation', () => {
    const grid = makeGrid(5, 7);
    const placedLogo: PlacedLogo = {
      logo: {
        name: 'Microsoft',
        width: 2,
        height: 2,
        cells: [
          { relX: 0, relY: 0, color: '#F25022' },
          { relX: 1, relY: 0, color: '#7FBA00' },
        ],
      },
      col: 3,
      row: 0,
    };
    const svg = renderSvg(grid, [], placedLogo, defaultOptions());
    expect(svg).toContain('fill="#F25022"');
    expect(svg).toContain('fill="#7FBA00"');
  });

  it('logo cells are not animated even if keyframes target them', () => {
    const grid = makeGrid(5, 7);
    const placedLogo: PlacedLogo = {
      logo: {
        name: 'test',
        width: 1,
        height: 1,
        cells: [{ relX: 0, relY: 0, color: '#FF0000' }],
      },
      col: 1,
      row: 0,
    };
    const kfs: AnimationKeyframe[] = [
      { cellX: 1, cellY: 0, startTime: 0.1, endTime: 0.2, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const svg = renderSvg(grid, kfs, placedLogo, defaultOptions());
    // The rect at col=1,row=0 should be a logo cell with #FF0000, not animated
    const lines = svg.split('\n');
    const logoLine = lines.find(l => l.includes('x="14" y="0"'));
    expect(logoLine).toContain('fill="#FF0000"');
    expect(logoLine).not.toContain('<animate');
  });

  it('includes dark mode CSS variables when darkPalette provided', () => {
    const grid = makeGrid(2, 2);
    const svg = renderSvg(grid, [], null, defaultOptions({ darkPalette }));
    expect(svg).toContain('<style>');
    expect(svg).toContain('--c0: #ebedf0');
    expect(svg).toContain('@media (prefers-color-scheme: dark)');
    expect(svg).toContain('--c0: #161b22');
  });

  it('uses CSS variables for static cells in dark mode', () => {
    const grid = makeGrid(2, 2);
    grid[0][0] = makeCell(0, 0, 2);
    const svg = renderSvg(grid, [], null, defaultOptions({ darkPalette }));
    expect(svg).toContain('fill="var(--c2)"');
    expect(svg).toContain('fill="var(--c0)"');
  });

  it('animated cells use literal colors even in dark mode', () => {
    const grid = makeGrid(2, 2);
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1, endTime: 0.2, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const svg = renderSvg(grid, kfs, null, defaultOptions({ darkPalette }));
    // The animated rect itself should have a literal fill
    const lines = svg.split('\n');
    const animLine = lines.find(l => l.includes('x="0" y="0"') && l.includes('<animate'));
    expect(animLine).toBeDefined();
    expect(animLine).toContain('fill="#ebedf0"');
    expect(animLine).not.toContain('var(--');
  });

  it('skips null cells in the grid', () => {
    const grid: Grid = [[makeCell(0, 0), null]];
    const svg = renderSvg(grid, [], null, defaultOptions());
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBe(1);
  });

  it('starts and ends with proper SVG tags', () => {
    const grid = makeGrid(2, 2);
    const svg = renderSvg(grid, [], null, defaultOptions());
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toMatch(/<\/svg>$/);
  });

  it('rect elements have rx="2" ry="2" for rounded corners', () => {
    const grid = makeGrid(1, 1);
    const svg = renderSvg(grid, [], null, defaultOptions());
    expect(svg).toContain('rx="2" ry="2"');
  });

  it('omits begin attribute when offset is 0', () => {
    const grid = makeGrid(2, 2);
    const kfs: AnimationKeyframe[] = [
      { cellX: 0, cellY: 0, startTime: 0.1, endTime: 0.2, baseColor: '#ebedf0', highlightColor: '#216e39', beginOffset: 0 },
    ];
    const svg = renderSvg(grid, kfs, null, defaultOptions());
    const animLine = svg.split('\n').find(l => l.includes('<animate'));
    expect(animLine).not.toContain('begin=');
  });
});
