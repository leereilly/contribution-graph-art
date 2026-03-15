import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { fetchContributions } from './fetch-contributions.js';
import { buildGrid } from './grid.js';
import { placeLogo, LogoPosition } from './logo.js';
import { generateTetrominoes } from './tetromino.js';
import { computeFallingAnimation } from './animator.js';
import { renderSvg } from './svg-renderer.js';
import { GITHUB_LIGHT, GITHUB_DARK } from './palettes.js';


async function run(): Promise<void> {
  try {
    const username = core.getInput('github_user_name', { required: true });
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN || '';
    const outputPath = core.getInput('output_path') || 'dist/contribution-graph.svg';
    const tetrominoCount = parseInt(core.getInput('tetromino_count') || '3', 10);
    const logoName = core.getInput('logo') || 'none';
    const logoPosition = (core.getInput('logo_position') || 'top-right') as LogoPosition;
    const paletteName = core.getInput('palette') || 'auto';
    const animationDuration = parseFloat(core.getInput('animation_duration') || '6.5');

    if (tetrominoCount < 0 || tetrominoCount > 9) {
      throw new Error('tetromino_count must be between 0 and 9');
    }

    core.info(`Fetching contributions for ${username}...`);
    const cells = await fetchContributions(username, token);
    core.info(`Fetched ${cells.length} contribution cells`);

    const grid = buildGrid(cells);
    core.info(`Built grid: ${grid.length} columns × 7 rows`);

    const placedLogo = placeLogo(logoName, logoPosition, grid);
    if (placedLogo) {
      core.info(`Placed ${placedLogo.logo.name} logo at ${logoPosition}`);
    }

    const palette = paletteName === 'github-dark' ? GITHUB_DARK : GITHUB_LIGHT;
    const darkPalette = paletteName === 'auto' ? GITHUB_DARK : undefined;

    const tetrominoes = generateTetrominoes(tetrominoCount, grid.length, 1.5, placedLogo);
    core.info(`Generated ${tetrominoes.length} tetrominoes`);

    const allKeyframes = tetrominoes.flatMap(t =>
      computeFallingAnimation(t, animationDuration, palette, grid)
    );
    core.info(`Computed ${allKeyframes.length} animation keyframes`);

    const cellSize = 11;
    const cellGap = 3;
    const svgWidth = grid.length * (cellSize + cellGap) - cellGap;
    const svgHeight = 7 * (cellSize + cellGap) - cellGap;

    const svg = renderSvg(grid, allKeyframes, placedLogo, {
      palette,
      darkPalette,
      animationDuration,
      width: svgWidth,
      height: svgHeight,
      cellSize,
      cellGap,
    });

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, svg, 'utf-8');
    core.info(`SVG written to ${outputPath}`);

    core.setOutput('svg_path', outputPath);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

run();
