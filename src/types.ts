export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface ContributionCell {
  x: number;        // week index (0–52)
  y: number;        // weekday (0=Sun, 6=Sat)
  date: string;     // YYYY-MM-DD
  count: number;    // contribution count
  level: ContributionLevel;
}

export type Grid = (ContributionCell | null)[][]; // [col][row], up to 53×7

export interface TetrominoPiece {
  name: string;           // I, O, T, S, Z, L, J
  shape: [number, number][];  // relative cell offsets [dx, dy]
}

export interface PlacedTetromino {
  piece: TetrominoPiece;
  col: number;          // grid column where the piece is placed
  rotation: number;     // rotation index (0-3)
  beginOffset: number;  // animation begin offset in seconds
}

export interface AnimationKeyframe {
  cellX: number;
  cellY: number;
  startTime: number;  // fraction of piece's own animation duration (0–1)
  endTime: number;    // fraction of piece's own animation duration (0–1)
  baseColor: string;
  highlightColor: string;
  beginOffset: number; // SVG begin attribute offset in seconds
}

export interface LogoDefinition {
  name: string;
  cells: { relX: number; relY: number; color: string }[];
  width: number;   // width in grid cells
  height: number;  // height in grid cells
}

export interface PlacedLogo {
  logo: LogoDefinition;
  col: number;  // top-left grid column
  row: number;  // top-left grid row
}

export interface Palette {
  name: string;
  colors: [string, string, string, string, string]; // levels 0-4
}

export interface RenderOptions {
  palette: Palette;
  darkPalette?: Palette;
  animationDuration: number; // total duration in seconds
  width: number;
  height: number;
  cellSize: number;
  cellGap: number;
}

export type AnimationMode = 'tetromino' | 'snake';

export interface SnakeOptions {
  initialLength: number;
  maxSteps: number;
  wrap: boolean;
  foodCount: number;
}

export interface GridPoint {
  x: number; // col
  y: number; // row
}

export interface SnakeStep extends GridPoint {
  ate: boolean;
}

export interface FoodCell {
  x: number;
  y: number;
}
