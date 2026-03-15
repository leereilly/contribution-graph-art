# 🧩 Contribution Graph Art

Generate an animated SVG of your GitHub contribution graph with falling [Tetris](https://en.wikipedia.org/wiki/Tetris) pieces or a classic [Snake](https://en.wikipedia.org/wiki/Snake_(video_game_genre)) game animation, with an optional logo overlay — all as a GitHub Action.

> The images below are generated daily from [@leereilly](https://github.com/leereilly)'s contribution graph via [this workflow](.github/workflows/contribution-graph-art.yml).

### Tetrominoes only (5 pieces)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-tetrominoes.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-tetrominoes.svg">
    <img alt="Contribution graph with 5 falling tetrominoes" src="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-tetrominoes.svg">
  </picture>
</p>

### Microsoft logo + tetrominoes (3 pieces)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-logo-tetrominoes.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-logo-tetrominoes.svg">
    <img alt="Contribution graph with Microsoft logo and 3 falling tetrominoes" src="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-logo-tetrominoes.svg">
  </picture>
</p>

### Microsoft logo only

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-logo.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-logo.svg">
    <img alt="Contribution graph with Microsoft logo" src="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-logo.svg">
  </picture>
</p>

### Snake

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-snake.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-snake.svg">
    <img alt="Contribution graph with Snake animation" src="https://raw.githubusercontent.com/leereilly/contribution-graph-art/output/contribution-graph-snake.svg">
  </picture>
</p>

## Usage

### Minimal

```yaml
- uses: leereilly/contribution-graph-art@v1
  with:
    github_user_name: ${{ github.repository_owner }}
```

### Full Configuration (Tetromino)

```yaml
- uses: leereilly/contribution-graph-art@v1
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

### Snake Mode

```yaml
- uses: leereilly/contribution-graph-art@v1
  with:
    github_user_name: ${{ github.repository_owner }}
    animation_mode: "snake"
    food_count: "5"
    output_path: dist/contribution-graph-snake.svg
```

### Complete Workflow Example

Create `.github/workflows/contribution-graph-art.yml` in your profile repo (`username/username`):

```yaml
name: Generate Contribution Art

on:
  schedule:
    - cron: "0 0 * * *" # daily at midnight UTC
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

      - name: Generate graph with tetrominoes only
        uses: leereilly/contribution-graph-art@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          tetromino_count: "5"
          output_path: dist/contribution-graph-tetrominoes.svg

      - name: Generate graph with logo and tetrominoes
        uses: leereilly/contribution-graph-art@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          tetromino_count: "3"
          logo: "microsoft"
          output_path: dist/contribution-graph-logo-tetrominoes.svg

      - name: Generate graph with logo only
        uses: leereilly/contribution-graph-art@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          tetromino_count: "0"
          logo: "microsoft"
          output_path: dist/contribution-graph-logo.svg

      - name: Generate graph with snake animation
        uses: leereilly/contribution-graph-art@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          animation_mode: "snake"
          food_count: "5"
          output_path: dist/contribution-graph-snake.svg

      - name: Push to output branch
        uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Then add this to your profile `README.md`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/contribution-graph-logo-tetrominoes.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/contribution-graph-logo-tetrominoes.svg">
  <img alt="Contribution graph with falling tetrominoes" src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/contribution-graph-logo-tetrominoes.svg">
</picture>
```

Replace `USERNAME` with your GitHub username.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github_user_name` | **Yes** | — | GitHub username to fetch contribution data for |
| `github_token` | No | `${{ github.token }}` | GitHub token for API access |
| `output_path` | No | `dist/contribution-graph.svg` | Output file path for the generated SVG |
| `animation_mode` | No | `tetromino` | Animation mode (`tetromino` or `snake`) |
| `tetromino_count` | No | `3` | Number of falling tetrominoes (0–9, tetromino mode only) |
| `food_count` | No | `5` | Number of red food squares for the snake to eat (1–15, snake mode only) |
| `logo` | No | `none` | Logo to overlay on the grid (e.g. `microsoft`, `none`) |
| `logo_position` | No | `top-right` | Logo position (`top-right`, `top-left`, `bottom-right`, `bottom-left`) |
| `palette` | No | `auto` | Color palette (`github-light`, `github-dark`, `auto`) |
| `animation_duration` | No | `6.5` | Total animation duration in seconds (tetromino mode only; snake mode auto-calculates) |

## Outputs

| Output | Description |
|--------|-------------|
| `svg_path` | Path to the generated SVG file |

## How It Works

1. **Fetches** your contribution data from the GitHub GraphQL API
2. **Builds** a 53×7 grid matching GitHub's contribution graph layout
3. **Animates** using the chosen mode:
   - **Tetromino** — randomly selected pieces (I, O, T, S, Z, L, J) fall top-to-bottom across the grid
   - **Snake** — a classic arcade snake slithers across the grid eating red food squares, growing longer with each bite, then exits off the right edge
4. **Overlays** an optional logo (e.g. Microsoft) in a corner of the grid
5. **Outputs** a single animated SVG file using `<animate>` elements with discrete keyframes

The `auto` palette uses CSS `@media (prefers-color-scheme)` so the graph adapts to the viewer's light/dark mode setting.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the action bundle
npm run build
```

## License

MIT
