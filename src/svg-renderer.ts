import { Grid, AnimationKeyframe, PlacedLogo, Palette, RenderOptions } from './types.js';
import { isLogoCel } from './logo.js';

/**
 * Group animation keyframes by cell position.
 * Multiple keyframes can target the same cell (piece passing through at different times).
 */
export function groupKeyframesByCell(
  keyframes: AnimationKeyframe[]
): Map<string, AnimationKeyframe[]> {
  const map = new Map<string, AnimationKeyframe[]>();
  for (const kf of keyframes) {
    const key = `${kf.cellX},${kf.cellY}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(kf);
  }
  return map;
}

/**
 * Build the keyTimes and values strings for a cell's <animate> element.
 *
 * The cell starts at baseColor, lights up at startTime with highlightColor,
 * then returns to baseColor at endTime. If multiple keyframes exist for the
 * same cell, they are merged in time order.
 */
export function buildAnimateAttributes(
  cellKeyframes: AnimationKeyframe[],
  beginOffset: number
): { keyTimes: string; values: string; begin: string } | null {
  if (cellKeyframes.length === 0) return null;

  const sorted = [...cellKeyframes].sort((a, b) => a.startTime - b.startTime);

  // Build raw sequence: [time, color] pairs
  // Start at time 0 with baseColor
  const entries: [number, string][] = [[0, sorted[0].baseColor]];

  for (const kf of sorted) {
    entries.push([kf.startTime, kf.highlightColor]);
    entries.push([kf.endTime, kf.baseColor]);
  }

  // Deduplicate: when consecutive entries share the same time,
  // keep the later one (it overrides the earlier at that instant)
  const deduped: [number, string][] = [];
  for (let i = 0; i < entries.length; i++) {
    if (i + 1 < entries.length && entries[i][0] === entries[i + 1][0]) {
      continue; // skip, next entry at same time takes precedence
    }
    deduped.push(entries[i]);
  }

  if (deduped.length < 2) return null;

  const keyTimes = deduped.map(([t]) => t.toFixed(4)).join(';');
  const values = deduped.map(([, c]) => c).join(';');
  const begin = beginOffset === 0 ? '0s' : `${beginOffset}s`;

  return { keyTimes, values, begin };
}

/**
 * Render the complete SVG string.
 */
export function renderSvg(
  grid: Grid,
  animations: AnimationKeyframe[],
  placedLogo: PlacedLogo | null,
  options: RenderOptions
): string {
  const { palette, darkPalette, animationDuration, cellSize, cellGap } = options;
  const pitch = cellSize + cellGap;

  // Grid dimensions: grid[col][row], columns-first
  const numCols = grid.length;
  const numRows = numCols > 0 ? grid[0].length : 7;

  const svgWidth = numCols * pitch - cellGap;
  const svgHeight = numRows * pitch - cellGap;

  const useDarkMode = darkPalette != null;

  const keyframeMap = groupKeyframesByCell(animations);

  const lines: string[] = [];

  // SVG header
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`
  );

  // Dark mode CSS custom properties
  if (useDarkMode) {
    lines.push('  <style>');
    lines.push(
      `    :root { --c0: ${palette.colors[0]}; --c1: ${palette.colors[1]}; --c2: ${palette.colors[2]}; --c3: ${palette.colors[3]}; --c4: ${palette.colors[4]}; }`
    );
    lines.push('    @media (prefers-color-scheme: dark) {');
    lines.push(
      `      :root { --c0: ${darkPalette!.colors[0]}; --c1: ${darkPalette!.colors[1]}; --c2: ${darkPalette!.colors[2]}; --c3: ${darkPalette!.colors[3]}; --c4: ${darkPalette!.colors[4]}; }`
    );
    lines.push('    }');
    lines.push('  </style>');
  }

  // Render cells column by column, row by row
  for (let col = 0; col < numCols; col++) {
    for (let row = 0; row < numRows; row++) {
      const cell = grid[col][row];
      if (cell == null) continue;

      const x = col * pitch;
      const y = row * pitch;
      const rectAttrs = `x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" ry="2"`;

      // Check if this is a logo cell
      const logoColor = isLogoCel(col, row, placedLogo);
      if (logoColor) {
        lines.push(`  <rect ${rectAttrs} fill="${logoColor}" />`);
        continue;
      }

      // Check for animations on this cell
      const cellKey = `${col},${row}`;
      const cellKeyframes = keyframeMap.get(cellKey);

      if (cellKeyframes && cellKeyframes.length > 0) {
        // All keyframes for a cell come from the same tetromino, so share beginOffset
        const beginOffset = cellKeyframes[0].beginOffset;
        const animAttrs = buildAnimateAttributes(cellKeyframes, beginOffset);
        if (animAttrs) {
          // Animated cells always use literal palette colors (not CSS vars)
          const fillColor = palette.colors[cell.level];
          const beginAttr = animAttrs.begin === '0s' ? '' : ` begin="${animAttrs.begin}"`;
          lines.push(
            `  <rect ${rectAttrs} fill="${fillColor}">` +
              `<animate attributeName="fill" calcMode="discrete" dur="${animationDuration}s"` +
              ` repeatCount="1" fill="freeze"${beginAttr}` +
              ` keyTimes="${animAttrs.keyTimes}"` +
              ` values="${animAttrs.values}" />` +
              `</rect>`
          );
          continue;
        }
      }

      // Static cell: use CSS var for dark mode support, or raw color
      const fill = useDarkMode
        ? `var(--c${cell.level})`
        : palette.colors[cell.level];
      lines.push(`  <rect ${rectAttrs} fill="${fill}" />`);
    }
  }

  lines.push('</svg>');
  return lines.join('\n');
}
