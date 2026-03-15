# ConribuArt: GitHub Contribution Graph + Tetromino Animation — Research & Implementation Plan

## Executive Summary

This report covers the design and implementation plan for **contribuart**, a GitHub Action that generates an animated SVG of a user's GitHub contribution graph with falling tetromino pieces and an optional configurable logo (e.g., Microsoft Windows logo) embedded in the grid squares. The existing hand-crafted SVG in the repo (`contribution-graph.svg`) provides an excellent reference implementation — it's a 53×7 grid of `<rect>` elements with `<animate>` children that create the illusion of falling Tetris pieces using discrete CSS animation keyframes[^1]. The Microsoft logo occupies a 2×2 cell block in the top-right corner using the official brand colors[^2].

Research into similar projects reveals two major prior-art GitHub Actions: **[Platane/snk](https://github.com/Platane/snk)** (5,660+ stars, snake game on contribution graph)[^3] and **[abozanona/pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph)** (93+ stars, Pac-Man game)[^4]. Both fetch contribution data via the GitHub GraphQL API's `contributionCalendar` endpoint, render animated SVGs, and are packaged as GitHub Actions for easy profile README integration. This project ("contribuart") differentiates itself with a Tetris/tetromino theme and configurable brand logo overlay.

---

## Table of Contents

1. [Analysis of the Existing SVG Reference](#1-analysis-of-the-existing-svg-reference)
2. [Prior Art: Similar GitHub Actions](#2-prior-art-similar-github-actions)
3. [GitHub Contribution Data API](#3-github-contribution-data-api)
4. [Architecture Overview](#4-architecture-overview)
5. [Implementation Plan](#5-implementation-plan)
6. [Action Configuration & Interface Design](#6-action-configuration--interface-design)
7. [User Integration Guide](#7-user-integration-guide)
8. [Confidence Assessment](#8-confidence-assessment)
9. [Footnotes](#9-footnotes)

---

## 1. Analysis of the Existing SVG Reference

The hand-crafted `contribution-graph.svg` in the repo serves as the style reference for the action output[^1].

### Grid Structure

- **Dimensions**: `width="739" height="95"` with `viewBox="0 0 739 95"`[^1]
- **Grid**: 53 columns × 7 rows = **371 `<rect>` elements** (matching GitHub's 53-week × 7-day layout)[^5]
- **Cell size**: 11×11 px with `rx="2" ry="2"` rounded corners
- **Cell spacing**: 14px pitch (11px cell + 3px gap)

### Color Palette (GitHub Light Theme)

| Color | Hex | Meaning | Count |
|-------|-----|---------|-------|
| Empty/none | `#ebedf0` | No contributions | 189 |
| Level 1 | `#9be9a8` | Low contributions | 143 |
| Level 2 | `#40c463` | Medium contributions | 24 |
| Level 3 | `#30a14e` | High contributions | 11 |
| Level 4 | `#216e39` | Highest (used in animations) | 0 (animation-only) |

These match GitHub's official contribution graph light palette exactly, as confirmed by the Platane/snk `palettes.ts`[^6].

### Microsoft Logo

The Windows logo is embedded as a 2×2 block of colored cells in the **top-right corner** of the grid (columns 51–52, rows 0–1)[^2]:

| Position | Color | Hex | Brand Quadrant |
|----------|-------|-----|----------------|
| (51, 0) | Red | `#F25022` | Top-left |
| (52, 0) | Green | `#7FBA00` | Top-right |
| (51, 1) | Blue | `#00A4EF` | Bottom-left |
| (52, 1) | Yellow | `#FFB900` | Bottom-right |

### Tetromino Falling Animation

The SVG contains **54 `<animate>` elements** spread across **3 tetromino groups**, each staggered with a `begin` offset[^7]:

| Tetromino | Begin Offset | Animated Cells | Column Range (grid) | Pattern |
|-----------|-------------|----------------|---------------------|---------|
| 1 | `0s` (default) | 18 cells | cols 10–12 | T-piece falling top→bottom |
| 2 | `1.5s` | 19 cells | cols 25–28 | T-piece falling with rotation |
| 3 | `3.0s` | 17 cells | cols 42–44 | T-piece falling top→bottom |

#### Animation Technique

Each animated cell uses an SVG `<animate>` element with these properties[^7]:
- `attributeName="fill"` — animates the fill color
- `calcMode="discrete"` — instant color switching (no interpolation), creating a pixel-art effect
- `dur="6.5s"` — total animation duration
- `repeatCount="1"` with `fill="freeze"` — plays once and stops
- `keyTimes` — fractional timestamps controlling when the cell lights up and turns off
- `values` — alternates between the cell's base color and `#216e39` (dark green, level 4)

The falling effect is achieved by staggering the `keyTimes` for each row: cells at row 0 light up earliest, and row 6 latest. Within a tetromino group, cells at the same row but different columns share the same appearance time to maintain the piece's shape as it "falls"[^7].

**Example** — Cell at grid (11,0) in tetromino 1:
```xml
<rect x="154" y="0" width="11" height="11" rx="2" ry="2" fill="#ebedf0">
  <animate attributeName="fill" calcMode="discrete" dur="6.5s"
           repeatCount="1" fill="freeze"
           keyTimes="0.0000;0.1538;0.3077"
           values="#ebedf0;#216e39;#ebedf0" />
</rect>
```
This cell appears at t=0.1538 (1.0s) and disappears at t=0.3077 (2.0s)[^7].

---

## 2. Prior Art: Similar GitHub Actions

### 2.1 Platane/snk (⭐ 5,660+)

**[Platane/snk](https://github.com/Platane/snk)** — The most popular contribution graph animation action[^3].

**What it does**: Generates a snake game that "eats" contribution cells, producing animated SVG or GIF.

**Architecture** (TypeScript monorepo with packages)[^8]:

| Package | Purpose |
|---------|---------|
| `github-user-contribution` | Fetches contribution data via GitHub GraphQL API |
| `types` | Grid, Snake, Point type definitions |
| `solver` | Computes the optimal snake path through the grid |
| `svg-creator` | Renders animated SVG with CSS keyframe animations |
| `gif-creator` | Renders animated GIF using canvas |
| `action` | GitHub Action entry point, orchestrates pipeline |
| `demo` | Interactive web demo |

**Key technical details**:
- **Data fetching**: Uses `contributionsCollection.contributionCalendar` GraphQL query[^9]
- **SVG rendering**: CSS animations with `--c1` through `--c4` CSS custom properties for colors, supports dark mode via `@media (prefers-color-scheme: dark)`[^10]
- **Action type**: Docker-based (Bun runtime), also has `svg-only` variant using `node20` runner[^11][^12]
- **Customization**: Color palettes (github, github-dark, github-light), custom snake color, custom dot colors via query string params[^13]

**Workflow usage pattern**[^3]:
```yaml
- uses: Platane/snk@v3
  with:
    github_user_name: ${{ github.repository_owner }}
    outputs: |
      dist/github-snake.svg
      dist/github-snake-dark.svg?palette=github-dark
```

### 2.2 abozanona/pacman-contribution-graph (⭐ 93+)

**[abozanona/pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph)** — Pac-Man themed contribution graph[^4].

**What it does**: Generates an animated SVG of Pac-Man eating contribution dots with ghost AI behaviors.

**Architecture** (TypeScript, webpack-bundled)[^14]:

| Directory | Purpose |
|-----------|---------|
| `src/providers/` | Data fetching (GitHub GraphQL + REST fallback, GitLab) |
| `src/core/` | Game logic, ghost AI |
| `src/movement/` | Pathfinding algorithms |
| `src/renderers/` | Canvas and SVG output renderers |
| `github-action/` | GitHub Action wrapper |
| `cli/` | CLI for local/CI usage |

**Key technical details**:
- **Dual data sources**: GraphQL with token (preferred) or REST API commit search fallback[^15]
- **Action type**: `node20` runner[^16]
- **Multi-platform**: GitHub + GitLab support[^4]
- **Themes**: github, github-dark, gitlab, gitlab-dark[^4]
- **npm package**: Also published as `pacman-contribution-graph` for CLI usage

### 2.3 Comparison Table

| Feature | Platane/snk | abozanona/pacman | **contribuart (planned)** |
|---------|-------------|------------------|---------------------------|
| Theme | Snake game | Pac-Man game | Tetromino falling |
| Stars | 5,660+ | 93+ | New |
| Output formats | SVG, GIF | SVG | SVG (GIF later) |
| Action runner | Docker (Bun) / Node20 | Node20 | Node20 (recommended) |
| Data source | GraphQL | GraphQL + REST fallback | GraphQL |
| Dark mode | Yes (CSS variables) | Yes (themes) | Yes (CSS variables) |
| Customization | Colors, palette | Speed, theme, sound | Tetromino count, logo, palette |
| Logo overlay | No | No | **Yes (configurable)** |
| Profile README | Yes | Yes | Yes |

---

## 3. GitHub Contribution Data API

Both major projects use the same GitHub GraphQL API endpoint. This is the canonical approach[^9][^15]:

### GraphQL Query

```graphql
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            contributionLevel  # NONE | FIRST_QUARTILE | SECOND_QUARTILE | THIRD_QUARTILE | FOURTH_QUARTILE
            date
            weekday  # 0=Sunday ... 6=Saturday
          }
        }
      }
    }
  }
}
```

**Authentication**: Requires a GitHub token (PAT or `${{ github.token }}` in Actions)[^9].

**Response structure**: Returns an array of weeks, each containing 7 days. Maps directly to the 53×7 grid (x=week index, y=weekday)[^9].

**Contribution levels** map to colors[^6]:

| Level | Constant | Grid Color (Light) |
|-------|----------|-------------------|
| 0 | `NONE` | `#ebedf0` |
| 1 | `FIRST_QUARTILE` | `#9be9a8` |
| 2 | `SECOND_QUARTILE` | `#40c463` |
| 3 | `THIRD_QUARTILE` | `#30a14e` |
| 4 | `FOURTH_QUARTILE` | `#216e39` |

---

## 4. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     GitHub Action Entry                       │
│  (action.yml → index.ts)                                     │
│  Reads inputs: username, token, tetromino_count, logo, etc.  │
└───────────────────────┬──────────────────────────────────────┘
                        │
           ┌────────────▼────────────┐
           │   Contribution Fetcher  │
           │   (GraphQL API)         │
           │   → Cell[] (x, y,       │
           │     level, count, date) │
           └────────────┬────────────┘
                        │
           ┌────────────▼────────────┐
           │    Grid Builder         │
           │    53×7 cell array      │
           │    + logo overlay       │
           └────────────┬────────────┘
                        │
           ┌────────────▼────────────┐
           │   Tetromino Engine      │
           │   - Random piece select │
           │   - Column placement    │
           │   - Falling keyframes   │
           │   - Collision detection │
           └────────────┬────────────┘
                        │
           ┌────────────▼────────────┐
           │    SVG Renderer         │
           │    - Grid rects         │
           │    - <animate> elements │
           │    - Logo cells         │
           │    - Dark mode support  │
           └────────────┬────────────┘
                        │
           ┌────────────▼────────────┐
           │    Output Writer        │
           │    → contribution-      │
           │      graph.svg          │
           └─────────────────────────┘
```

---

## 5. Implementation Plan

### Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Matches prior art, good SVG string manipulation, type safety |
| Runtime | Node.js 20 | `node20` action runner — fast startup, no Docker overhead (unlike snk's Docker approach)[^11][^12] |
| Build | esbuild or tsx | Fast bundling for single-file dist output |
| Package manager | npm | Simplest for GitHub Action consumption |
| Testing | Vitest | Fast, TypeScript-native |

### Project Structure

```
contribuart/
├── action.yml                    # GitHub Action definition
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # Action entry point
│   ├── fetch-contributions.ts    # GitHub GraphQL API client
│   ├── grid.ts                   # Grid data structure & builder
│   ├── tetromino.ts              # Tetromino definitions & engine
│   ├── logo.ts                   # Logo overlay definitions (Microsoft, etc.)
│   ├── animator.ts               # Falling animation keyframe calculator
│   ├── svg-renderer.ts           # SVG string generation
│   ├── palettes.ts               # Color palettes (light, dark, custom)
│   └── types.ts                  # Shared type definitions
├── tests/
│   ├── fetch-contributions.test.ts
│   ├── tetromino.test.ts
│   ├── animator.test.ts
│   ├── svg-renderer.test.ts
│   └── fixtures/                 # Sample contribution data
├── dist/
│   └── index.js                  # Bundled action (committed)
└── README.md
```

### Step-by-Step Implementation

#### Phase 1: Core Data Layer

**1.1 — Contribution Fetcher** (`src/fetch-contributions.ts`)

Fetch contribution data using the GitHub GraphQL API:

```typescript
interface ContributionCell {
  x: number;        // week index (0–52)
  y: number;        // weekday (0=Sun, 6=Sat)
  date: string;     // YYYY-MM-DD
  count: number;    // contribution count
  level: 0 | 1 | 2 | 3 | 4;  // quartile level
}

async function fetchContributions(
  username: string,
  token: string
): Promise<ContributionCell[]>
```

Pattern validated by both Platane/snk[^9] and pacman-contribution-graph[^15].

**1.2 — Grid Builder** (`src/grid.ts`)

Transform contribution cells into a 53×7 grid array. Each cell stores its base color and level.

**1.3 — Type Definitions** (`src/types.ts`)

```typescript
type Color = string;
type Grid = ContributionCell[][];  // [col][row], 53×7

interface TetrominoPiece {
  name: string;           // I, O, T, S, Z, L, J
  shape: [number, number][];  // relative cell offsets
  color: string;          // animation highlight color
}

interface AnimationKeyframe {
  cellX: number;
  cellY: number;
  startTime: number;  // fraction of total duration
  endTime: number;
  baseColor: string;
  highlightColor: string;
}
```

#### Phase 2: Tetromino Engine

**2.1 — Tetromino Definitions** (`src/tetromino.ts`)

Define the 7 standard Tetris pieces (I, O, T, S, Z, L, J) as relative coordinate arrays:

```typescript
const TETROMINOES = {
  I: { shape: [[0,0], [1,0], [2,0], [3,0]], rotations: [...] },
  O: { shape: [[0,0], [1,0], [0,1], [1,1]], rotations: [...] },
  T: { shape: [[0,0], [1,0], [2,0], [1,1]], rotations: [...] },
  S: { shape: [[1,0], [2,0], [0,1], [1,1]], rotations: [...] },
  Z: { shape: [[0,0], [1,0], [1,1], [2,1]], rotations: [...] },
  L: { shape: [[0,0], [0,1], [1,1], [2,1]], rotations: [...] },
  J: { shape: [[2,0], [0,1], [1,1], [2,1]], rotations: [...] },
};
```

**2.2 — Placement Engine**

- Randomly select `N` tetromino pieces (N = configurable, 0–9)
- For each piece:
  - Select a random column span within the 53-column grid
  - Choose a random rotation
  - Ensure pieces don't overlap with the logo cells or each other
  - Pieces fall from row 0 to row 6 (top to bottom)
- Stagger `begin` times: e.g., `0s`, `1.5s`, `3.0s`, etc. (matching existing pattern)[^7]

**2.3 — Falling Animation Calculator** (`src/animator.ts`)

For each tetromino piece, compute `keyTimes` and `values` for each affected cell:

```typescript
function computeFallingAnimation(
  piece: TetrominoPiece,
  startCol: number,
  totalDuration: number,
  beginOffset: number,
  grid: Grid
): AnimationKeyframe[]
```

The algorithm follows the existing SVG's pattern[^7]:
1. Divide the 7-row fall into steps (e.g., 1 step per row)
2. At each step, the tetromino occupies cells at its current position
3. Each cell's `keyTimes` records when it lights up (piece arrives) and when it goes dark (piece moves to next row)
4. Cells can have multiple activations if the piece passes through them at different points (e.g., rotation)

#### Phase 3: Logo Overlay

**3.1 — Logo Definitions** (`src/logo.ts`)

```typescript
interface LogoDefinition {
  name: string;
  cells: { relX: number; relY: number; color: string }[];
}

const LOGOS: Record<string, LogoDefinition> = {
  microsoft: {
    name: "Microsoft",
    cells: [
      { relX: 0, relY: 0, color: "#F25022" },  // Red
      { relX: 1, relY: 0, color: "#7FBA00" },  // Green
      { relX: 0, relY: 1, color: "#00A4EF" },  // Blue
      { relX: 1, relY: 1, color: "#FFB900" },  // Yellow
    ],
  },
  // Future: github, apple, etc.
};
```

Logo placement: top-right corner by default (columns 51–52, rows 0–1)[^2], but configurable via `logo_position` input.

#### Phase 4: SVG Renderer

**4.1 — SVG Generator** (`src/svg-renderer.ts`)

Generate the complete SVG string:

```typescript
function renderSvg(
  grid: Grid,
  animations: AnimationKeyframe[],
  logo: LogoDefinition | null,
  palette: Palette,
  options: RenderOptions
): string
```

Key rendering rules (matching existing SVG style)[^1]:
- SVG wrapper: `<svg xmlns="http://www.w3.org/2000/svg" width="739" height="95" viewBox="0 0 739 95">`
- Each cell: `<rect x="{col*14}" y="{row*14}" width="11" height="11" rx="2" ry="2" fill="{color}" />`
- Animated cells get a child `<animate>` element instead of self-closing `<rect />`
- Logo cells get their brand colors as static `fill` values

**4.2 — Dark Mode Support**

Follow Platane/snk's approach with CSS custom properties[^10]:

```xml
<style>
  :root { --c0: #ebedf0; --c1: #9be9a8; --c2: #40c463; --c3: #30a14e; --c4: #216e39; }
  @media (prefers-color-scheme: dark) {
    :root { --c0: #161b22; --c1: #01311f; --c2: #034525; --c3: #0f6d31; --c4: #00c647; }
  }
</style>
```

#### Phase 5: GitHub Action Packaging

**5.1 — action.yml**

```yaml
name: "contribuart"
description: "Generate an animated contribution graph SVG with falling tetrominoes and optional logo overlay"
author: "leereilly"
branding:
  icon: "grid"
  color: "green"

inputs:
  github_user_name:
    description: "GitHub username to fetch contribution data for"
    required: true
  github_token:
    description: "GitHub token for API access"
    required: false
    default: ${{ github.token }}
  output_path:
    description: "Output file path for the generated SVG"
    required: false
    default: "dist/contribution-graph.svg"
  tetromino_count:
    description: "Number of falling tetrominoes (0–9)"
    required: false
    default: "3"
  logo:
    description: "Logo to overlay on the grid (e.g., 'microsoft', 'none')"
    required: false
    default: "none"
  logo_position:
    description: "Position of the logo ('top-right', 'top-left', 'bottom-right', 'bottom-left')"
    required: false
    default: "top-right"
  palette:
    description: "Color palette ('github-light', 'github-dark', 'auto')"
    required: false
    default: "auto"
  animation_duration:
    description: "Total animation duration in seconds"
    required: false
    default: "6.5"

runs:
  using: "node20"
  main: "dist/index.js"
```

**5.2 — Build Pipeline**

Use `esbuild` or `ncc` to bundle `src/index.ts` → `dist/index.js`. The `dist/` directory is committed to the repo (standard practice for JS GitHub Actions)[^12][^16].

**5.3 — CI/CD Workflow**

```yaml
# .github/workflows/build.yml
name: Build
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm run build
```

#### Phase 6: Testing

**6.1 — Unit Tests**

| Test File | What's Tested |
|-----------|---------------|
| `fetch-contributions.test.ts` | GraphQL query construction, response parsing, error handling |
| `tetromino.test.ts` | Piece definitions, rotation, placement within bounds, collision detection |
| `animator.test.ts` | keyTimes calculation, falling sequence, stagger offsets |
| `svg-renderer.test.ts` | SVG output structure, rect count, animation elements, logo placement |

**6.2 — Snapshot Tests**

Generate SVGs with known contribution data fixtures and snapshot-test the output to catch regressions.

**6.3 — Visual Validation**

Include a `demo/` script or workflow that generates sample SVGs for manual visual inspection.

---

## 6. Action Configuration & Interface Design

### Minimal Usage

```yaml
- uses: leereilly/contribuart@v1
  with:
    github_user_name: ${{ github.repository_owner }}
```

### Full Configuration

```yaml
- uses: leereilly/contribuart@v1
  with:
    github_user_name: ${{ github.repository_owner }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    output_path: dist/contribution-graph.svg
    tetromino_count: "5"
    logo: "microsoft"
    logo_position: "top-right"
    palette: "auto"
    animation_duration: "8"
```

### Complete Workflow Example

```yaml
name: Generate Contribution Art

on:
  schedule:
    - cron: "0 0 * * *"  # Daily
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Generate contribution graph SVG
        uses: leereilly/contribuart@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          tetromino_count: "3"
          logo: "microsoft"

      - name: Push to output branch
        uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 7. User Integration Guide

### Adding to Profile README

Users add to their `username/username` repo's `README.md`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/contribution-graph-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/contribution-graph.svg">
  <img alt="Contribution graph with falling tetrominoes" src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/contribution-graph.svg">
</picture>
```

This pattern is established by both snk[^3] and pacman-contribution-graph[^4] and correctly handles GitHub's dark/light theme switching.

---

## 8. Confidence Assessment

### High Confidence

- **SVG structure and animation technique**: Thoroughly analyzed from the existing `contribution-graph.svg` — the `<animate>` discrete keyframe approach is well-understood and works in GitHub's SVG renderer[^1][^7]
- **GitHub GraphQL API for contributions**: Well-documented, used identically by both major prior-art projects[^9][^15]
- **GitHub Action packaging**: `node20` runner with bundled `dist/index.js` is the standard, proven approach[^12][^16]
- **Microsoft logo colors and placement**: Directly extracted from the reference SVG[^2]

### Medium Confidence

- **Tetromino collision/placement algorithm**: The reference SVG uses simple non-overlapping column groups. Scaling to 9 tetrominoes on a 53×7 grid needs careful spacing logic — the grid has 53 columns and each tetromino uses ~3–4 columns, so 9 tetrominoes would use ~27–36 columns, which is feasible but requires overlap avoidance
- **Dark mode palette**: Palette values taken from Platane/snk[^6]; GitHub's actual dark mode colors should be verified against the current GitHub UI
- **Animation duration tuning**: 6.5s from the reference works for 3 tetrominoes; more tetrominoes may need longer duration or faster falling speed

### Lower Confidence

- **GitHub SVG rendering constraints**: GitHub sanitizes SVGs in READMEs — CSS `@media` queries for dark mode work (confirmed by snk users)[^3], but more complex CSS features may be stripped. All animation should use inline SVG `<animate>` elements rather than CSS `@keyframes` to maximize compatibility
- **Logo extensibility**: Only the Microsoft logo is defined in the reference. Other logos would need to be designed to fit within the contribution grid's cell constraints (2×2 minimum, expandable)

### Assumptions Made

1. The action will be published to the GitHub Marketplace under `leereilly/contribuart`
2. TypeScript + Node.js 20 is the preferred stack (matches all prior art)
3. SVG-only output for v1; GIF support can be added later
4. The `github.token` provided by Actions has sufficient permissions for the GraphQL contribution query
5. Tetromino pieces use the standard 7 Tetris piece set (I, O, T, S, Z, L, J)

---

## 9. Footnotes

[^1]: `/Users/leereilly/github/contribuart/contribution-graph.svg` — hand-crafted reference SVG, 371 rect elements in 53×7 grid layout
[^2]: `/Users/leereilly/github/contribuart/contribution-graph.svg` — Microsoft logo at pixel positions (714,0), (728,0), (714,14), (728,14) using brand colors #F25022, #7FBA00, #00A4EF, #FFB900
[^3]: [Platane/snk](https://github.com/Platane/snk) — README.md, 5,660+ stars, generates snake game from contribution graph
[^4]: [abozanona/pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph) — README.md, 93+ stars, Pac-Man contribution graph animation
[^5]: `/Users/leereilly/github/contribuart/contribution-graph.svg` — 371 `<rect>` elements confirmed via `grep -c '<rect'`
[^6]: [Platane/snk](https://github.com/Platane/snk) — `packages/action/palettes.ts`, defines `github-light` and `github-dark` color palettes
[^7]: `/Users/leereilly/github/contribuart/contribution-graph.svg` — 54 `<animate>` elements in 3 groups (begin=0s: 18 cells, begin=1.5s: 19 cells, begin=3.0s: 17 cells) using `calcMode="discrete"`
[^8]: [Platane/snk](https://github.com/Platane/snk) — `packages/` directory containing action, demo, draw, gif-creator, github-user-contribution, github-user-contribution-service, solver, svg-creator, types
[^9]: [Platane/snk](https://github.com/Platane/snk) — `packages/github-user-contribution/index.ts`, GraphQL query using `contributionsCollection.contributionCalendar`
[^10]: [Platane/snk](https://github.com/Platane/snk) — `packages/svg-creator/index.ts`, `generateColorVar()` function with CSS custom properties and `@media (prefers-color-scheme: dark)` support
[^11]: [Platane/snk](https://github.com/Platane/snk) — `Dockerfile`, uses `oven/bun:1.3.4-slim` for Docker-based action
[^12]: [Platane/snk](https://github.com/Platane/snk) — `svg-only/action.yml`, uses `node20` runner with `dist/index.js` entry point
[^13]: [Platane/snk](https://github.com/Platane/snk) — `action.yml`, outputs support query string options for palette, color_snake, color_dots
[^14]: [abozanona/pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph) — `src/` directory structure with core, movement, providers, renderers
[^15]: [abozanona/pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph) — `src/providers/github-contributions.ts`, dual GraphQL/REST approach for contribution fetching
[^16]: [abozanona/pacman-contribution-graph](https://github.com/abozanona/pacman-contribution-graph) — `action.yml`, uses `node20` runner
